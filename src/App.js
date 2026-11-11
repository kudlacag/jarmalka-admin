import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabaseUrl = 'https://yycpkepjdgdvsixdtgth.supabase.co';
const supabaseKey = 'sb_publishable_hpYwrAyO67bLP1-wDhK-zg_mxXebufV';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- UI COMPONENTS ---
const Card = ({ children, style }) => (
  <div style={{ backgroundColor: '#FFF', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', ...style }}>
    {children}
  </div>
);

const Input = (props) => <input {...props} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', backgroundColor: '#F8FAFC', marginBottom: '12px', boxSizing: 'border-box', ...props.style }} />;

const Button = ({ children, onClick, type = 'button', variant = 'primary', style }) => {
  const base = { padding: '12px 20px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' };
  const variants = {
    primary: { backgroundColor: '#6366F1', color: 'white' },
    danger: { backgroundColor: '#F43F5E', color: 'white' },
    secondary: { backgroundColor: '#F1F5F9', color: '#334155' },
    success: { backgroundColor: '#10B981', color: 'white' }
  };
  return <button type={type} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
};

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('users'); // Default to users so you see them immediately

  // --- Lessons State ---
  const [lessons, setLessons] = useState([]);
  const [editingLesson, setEditingLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [lessonActivities, setLessonActivities] = useState([]); 
  
  const [newDe, setNewDe] = useState('');
  const [newSo, setNewSo] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [newLesson, setNewLesson] = useState({ id: '', level: 'a2', unit: 1, title_so: '', title_de: '', is_premium: true });

  // --- Users State ---
  const [users, setUsers] = useState([]);

  // --- Articles State ---
  const [articles, setArticles] = useState([]);
  const [newArticle, setNewArticle] = useState({ title_so: '', title_de: '', body_so: '', body_de: '' });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // --- Activities State ---
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({ lesson_id: '', type: 'reading', title_so: '', title_de: '', content_so: '', content_de: '', image_url: '', audio_url: '' });
  const [wordBank, setWordBank] = useState('');
  const [fbSentence, setFbSentence] = useState('');
  const [fbAnswer, setFbAnswer] = useState('');
  const [fillBlankQuestions, setFillBlankQuestions] = useState([]);
  const [activityQuestions, setActivityQuestions] = useState([]);
  const [newQ, setNewQ] = useState({ question: '', options: '', answer: '' });
  const [editingActivity, setEditingActivity] = useState(null);
  const [editNewQ, setEditNewQ] = useState({ question: '', options: '', answer: '' });
  const [editFbSentence, setEditFbSentence] = useState('');
  const [editFbAnswer, setEditFbAnswer] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchLessons(); 
      if (activeTab === 'articles') fetchArticles();
      if (activeTab === 'activities') fetchActivities();
      if (activeTab === 'users') fetchUsers();
    }
  }, [session, activeTab]);

  // --- FETCH FUNCTIONS ---
  async function fetchLessons() {
    const { data } = await supabase.from('lessons').select('*').order('level').order('unit');
    if (data) setLessons(data);
  }
  
  async function fetchUsers() {
    const { data, error } = await supabase.rpc('get_admin_users');
    if (!error && data) {
      setUsers(data);
    } 
  }

  async function fetchActivities() {
    const { data } = await supabase.from('activities').select('*').order('created_at', { ascending: false });
    if (data) setActivities(data);
  }

  async function fetchArticles() {
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    if (data) setArticles(data);
  }
        
  // --- USER PREMIUM LOGIC ---
  async function togglePremium(userId, currentStatus) {
    const { error } = await supabase.from('user_stats').update({ is_premium: !currentStatus }).eq('user_id', userId);
    if (!error) {
      fetchUsers();
    } else {
      alert("Error updating premium: " + error.message);
    }
  }

  // --- LESSON FUNCTIONS ---
  async function handleCreateLesson(e) {
    e.preventDefault();
    const { error } = await supabase.from('lessons').insert(newLesson);
    if (!error) {
      alert("Lesson created!");
      setNewLesson({ id: '', level: 'a2', unit: 1, title_so: '', title_de: '', is_premium: true });
      fetchLessons();
    } else alert("Error: " + error.message);
  }

  async function handleDeleteLesson(id) {
    if (!window.confirm("Are you sure? This will delete the lesson AND all its vocabulary & activities!")) return;
    await supabase.from('lessons').delete().eq('id', id);
    fetchLessons();
  }

  async function handleEditClick(lesson) {
    setEditingLesson(lesson);
    const { data: vocabData } = await supabase.from('vocabulary').select('*').eq('lesson_id', lesson.id);
    if (vocabData) setVocabulary(vocabData);
    const { data: exData } = await supabase.from('exercises').select('*').eq('lesson_id', lesson.id);
    if (exData) setExercises(exData);
    const { data: actData } = await supabase.from('activities').select('*').eq('lesson_id', lesson.id);
    if (actData) setLessonActivities(actData);
  }

  async function handleSaveLesson() {
    await supabase.from('lessons').update({ title_so: editingLesson.title_so, title_de: editingLesson.title_de, unit: editingLesson.unit, is_premium: editingLesson.is_premium }).eq('id', editingLesson.id);
    alert("Lesson saved!");
    fetchLessons();
  }

  async function handleAddVocab(e) {
    e.preventDefault();
    const { data } = await supabase.from('vocabulary').insert({ lesson_id: editingLesson.id, de: newDe, so: newSo }).select();
    if (data) { setVocabulary([...vocabulary, data[0]]); setNewDe(''); setNewSo(''); }
  }
  async function handleDeleteVocab(id) { await supabase.from('vocabulary').delete().eq('id', id); setVocabulary(vocabulary.filter(v => v.id !== id)); }
  
  async function handleAddExercise(e) {
    e.preventDefault();
    const optionsArray = newOptions.split(',').map(s => s.trim()).filter(s => s !== '');
    const { data } = await supabase.from('exercises').insert({ lesson_id: editingLesson.id, type: 'sentence_build', prompt: newPrompt, correct_answer: newCorrectAnswer, options: optionsArray }).select();
    if (data) { setExercises([...exercises, data[0]]); setNewPrompt(''); setNewCorrectAnswer(''); setNewOptions(''); }
  }
  async function handleDeleteExercise(id) { await supabase.from('exercises').delete().eq('id', id); setExercises(exercises.filter(e => e.id !== id)); }

  // --- ACTIVITY FUNCTIONS ---
  async function handleCreateActivity(e) {
    e.preventDefault();
    let finalQuestions = newActivity.type === 'fill_blank' ? { wordBank: wordBank.split(',').map(w => w.trim()), sentences: fillBlankQuestions } : activityQuestions;
    const { error } = await supabase.from('activities').insert({ ...newActivity, questions: finalQuestions });
    if (!error) {
      alert("Activity published!");
      setNewActivity({ lesson_id: '', type: 'reading', title_so: '', title_de: '', content_so: '', content_de: '', image_url: '', audio_url: '' });
      setActivityQuestions([]); setFillBlankQuestions([]); setWordBank(''); fetchActivities();
    } else alert("Error: " + error.message);
  }

  async function handleUpdateActivity() {
    if (!editingActivity) return;
    const { error } = await supabase.from('activities').update({ title_so: editingActivity.title_so, title_de: editingActivity.title_de, content_so: editingActivity.content_so, content_de: editingActivity.content_de, image_url: editingActivity.image_url, audio_url: editingActivity.audio_url, questions: editingActivity.questions }).eq('id', editingActivity.id);
    if (!error) { alert("Activity updated!"); setEditingActivity(null); fetchActivities(); } else alert("Error: " + error.message);
  }

  async function handleDeleteActivity(id) {
    if (!window.confirm("Delete this activity?")) return;
    await supabase.from('activities').delete().eq('id', id); fetchActivities(); if(editingActivity && editingActivity.id === id) setEditingActivity(null);
  }

  function handleAddQuestion(e) {
    e.preventDefault();
    setActivityQuestions([...activityQuestions, { question: newQ.question, options: newQ.options.split(',').map(s => s.trim()), answer: newQ.answer }]);
    setNewQ({ question: '', options: '', answer: '' });
  }

  function handleAddEditQuestion(e) {
    e.preventDefault();
    setEditingActivity({ ...editingActivity, questions: [...(editingActivity.questions || []), { question: editNewQ.question, options: editNewQ.options.split(',').map(s => s.trim()), answer: editNewQ.answer }] });
    setEditNewQ({ question: '', options: '', answer: '' });
  }
  function handleDeleteEditQuestion(index) { let n = [...editingActivity.questions]; n.splice(index, 1); setEditingActivity({ ...editingActivity, questions: n }); }
  
  function handleAddEditFbSentence(e) {
    e.preventDefault(); if(!editFbSentence || !editFbAnswer) return;
    const curr = editingActivity.questions || { wordBank: [], sentences: [] };
    setEditingActivity({ ...editingActivity, questions: { ...curr, sentences: [...(curr.sentences || []), { text: editFbSentence, answer: editFbAnswer }] } });
    setEditFbSentence(''); setEditFbAnswer('');
  }
  function handleDeleteEditFbSentence(index) {
    let curr = { ...editingActivity.questions }; let n = [...curr.sentences]; n.splice(index, 1); curr.sentences = n;
    setEditingActivity({ ...editingActivity, questions: curr });
  }

  // --- ARTICLE FUNCTIONS ---
  async function handleCreateArticle(e) {
    e.preventDefault(); setUploading(true); let imageUrl = '';
    if (imageFile) {
      const fileName = `${Date.now()}.${imageFile.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('article-images').upload(fileName, imageFile);
      if (!error) { const { data: { publicUrl } } = supabase.storage.from('article-images').getPublicUrl(fileName); imageUrl = publicUrl; }
    }
    const { error } = await supabase.from('articles').insert({ ...newArticle, image_url: imageUrl });
    if (!error) { alert("Article published!"); setNewArticle({ title_so: '', title_de: '', body_so: '', body_de: '' }); setImageFile(null); fetchArticles(); }
    setUploading(false);
  }
  async function handleDeleteArticle(id) {
    if (!window.confirm("Delete this article?")) return;
    await supabase.from('articles').delete().eq('id', id); fetchArticles();
  }

  const groupedActivities = activities.reduce((acc, act) => { if (!acc[act.lesson_id]) acc[act.lesson_id] = []; acc[act.lesson_id].push(act); return acc; }, {});

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#F8FAFC' }}>
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setError(error.message); }} style={{ background: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' }}>
          <h1 style={{ textAlign: 'center', color: '#0F172A', marginBottom: '30px', fontSize: '28px', fontWeight: '900' }}>Jarmalka Admin</h1>
          {error && <p style={{ color: '#F43F5E', fontSize: '14px', backgroundColor: '#FFF1F2', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>{error}</p>}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" style={{ width: '100%', marginTop: '10px' }}>Login to Dashboard</Button>
        </form>
      </div>
    );
  }

  // --- RENDER EDIT LESSON ---
  if (editingLesson) {
    return (
      <div style={{ padding: '40px', backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
        <button onClick={() => setEditingLesson(null)} style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFF', fontWeight: '600' }}>← Back to Dashboard</button>
        
        <Card style={{ marginBottom: '30px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#0F172A' }}>Edit Lesson: {editingLesson.id}</h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '100px' }}><label style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Unit</label><Input type="number" value={editingLesson.unit} onChange={(e) => setEditingLesson({...editingLesson, unit: parseInt(e.target.value)})} /></div>
            <div style={{ flex: 2, minWidth: '200px' }}><label style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Title (Somali)</label><Input type="text" value={editingLesson.title_so} onChange={(e) => setEditingLesson({...editingLesson, title_so: e.target.value})} /></div>
            <div style={{ flex: 2, minWidth: '200px' }}><label style={{ fontWeight: '600', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Title (German)</label><Input type="text" value={editingLesson.title_de} onChange={(e) => setEditingLesson({...editingLesson, title_de: e.target.value})} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px' }}>
              <input type="checkbox" checked={editingLesson.is_premium} onChange={(e) => setEditingLesson({...editingLesson, is_premium: e.target.checked})} style={{ width: '20px', height: '20px' }} />
              <label style={{ fontWeight: '700', color: '#6366F1' }}>Premium</label>
            </div>
          </div>
          <Button onClick={handleSaveLesson} style={{ marginTop: '20px' }}>Save Details</Button>
        </Card>

        <Card style={{ marginBottom: '30px', borderLeft: '4px solid #F59E0B' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Activities for this Lesson ({lessonActivities.length})</h3>
          {lessonActivities.map(act => (
            <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '8px' }}>
              <span><strong>{act.type.replace('_', ' ')}:</strong> {act.title_so}</span>
              <button onClick={() => { if(window.confirm("Delete?")) supabase.from('activities').delete().eq('id', act.id).then(() => setLessonActivities(lessonActivities.filter(a => a.id !== act.id))); }} style={{ color: '#F43F5E', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
            </div>
          ))}
        </Card>

        <Card style={{ marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Vocabulary</h3>
          <form onSubmit={handleAddVocab} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Input type="text" placeholder="German Word" value={newDe} onChange={(e) => setNewDe(e.target.value)} required style={{ flex: 1, minWidth: '150px' }} />
            <Input type="text" placeholder="Somali Translation" value={newSo} onChange={(e) => setNewSo(e.target.value)} required style={{ flex: 1, minWidth: '150px' }} />
            <Button type="submit" variant="success">Add</Button>
          </form>
          <div style={{ marginTop: '20px' }}>
            {vocabulary.map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #F1F5F9' }}>
                <span>{v.de} - {v.so}</span>
                <button onClick={() => handleDeleteVocab(v.id)} style={{ color: '#F43F5E', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 20px 0' }}>Sentence Build Exercises</h3>
          <form onSubmit={handleAddExercise} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <Input type="text" placeholder="Prompt (Somali)" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} required style={{ flex: 1, minWidth: '150px' }} />
            <Input type="text" placeholder="Correct Answer (German)" value={newCorrectAnswer} onChange={(e) => setNewCorrectAnswer(e.target.value)} required style={{ flex: 1, minWidth: '150px' }} />
            <Input type="text" placeholder="Options (comma separated)" value={newOptions} onChange={(e) => setNewOptions(e.target.value)} required style={{ flex: 2, minWidth: '200px' }} />
            <Button type="submit" variant="success">Add</Button>
          </form>
          {exercises.map(ex => (
            <div key={ex.id} style={{ padding: '10px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between' }}>
              <span>{ex.prompt} - <b>{ex.correct_answer}</b></span>
              <button onClick={() => handleDeleteExercise(ex.id)} style={{ color: '#F43F5E', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  return (
    <div style={{ padding: '40px', backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#0F172A', margin: 0, fontSize: '32px', fontWeight: '900', letterSpacing: '-0.5px' }}>Jarmalka Admin</h1>
        <button onClick={() => supabase.auth.signOut()} style={{ padding: '10px 20px', backgroundColor: '#FFF', color: '#F43F5E', border: '1px solid #F43F5E', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        {['users', 'lessons', 'activities', 'articles'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setEditingActivity(null); }} style={{ padding: '12px 24px', backgroundColor: activeTab === tab ? '#0F172A' : '#FFF', color: activeTab === tab ? 'white' : '#64748B', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: activeTab === tab ? '0 4px 12px rgba(15,23,42,0.2)' : 'none', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* USERS TAB (NOW PROPERLY WRAPPED IN A CARD) */}
      {activeTab === 'users' && (
        <Card>
          <h2 style={{ margin: '0 0 10px 0' }}>User Management & Testers</h2>
          <p style={{ color: '#64748B', marginBottom: '20px', fontSize: '14px' }}>Grant premium access to your 14-day testers here. They will instantly be able to access A2 and B1 courses in the app.</p>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>Email</th>
                <th style={{ padding: '12px' }}>XP</th>
                <th style={{ padding: '12px' }}>Last Active</th>
                <th style={{ padding: '12px' }}>Premium</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px', fontWeight: '600', color: '#334155' }}>
                    {u.email}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.total_xp}</td>
                  <td style={{ padding: '12px', color: '#64748B', fontSize: '13px' }}>
                    {u.last_active_date ? new Date(u.last_active_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {u.is_premium ? (
                      <span style={{ backgroundColor: '#ECFDF5', color: '#10B981', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>ACTIVE</span>
                    ) : (
                      <span style={{ backgroundColor: '#F1F5F9', color: '#94A3B8', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}>LOCKED</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <Button variant={u.is_premium ? 'danger' : 'success'} onClick={() => togglePremium(u.user_id, u.is_premium)} style={{ padding: '6px 12px', fontSize: '12px' }}>
                      {u.is_premium ? 'Revoke Premium' : 'Grant Premium'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* LESSONS TAB */}
      {activeTab === 'lessons' && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: '300px', height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Create New Lesson</h3>
            <form onSubmit={handleCreateLesson}>
              <Input type="text" placeholder="ID (e.g., a2-01-vacation)" value={newLesson.id} onChange={(e) => setNewLesson({...newLesson, id: e.target.value})} required />
              <select value={newLesson.level} onChange={(e) => setNewLesson({...newLesson, level: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '12px', backgroundColor: '#F8FAFC' }}>
                <option value="a1">Level A1 (Free)</option>
                <option value="a2">Level A2</option>
                <option value="b1">Level B1</option>
              </select>
              <Input type="number" placeholder="Unit Number" value={newLesson.unit} onChange={(e) => setNewLesson({...newLesson, unit: parseInt(e.target.value)})} required />
              <Input type="text" placeholder="Title (Somali)" value={newLesson.title_so} onChange={(e) => setNewLesson({...newLesson, title_so: e.target.value})} required />
              <Input type="text" placeholder="Title (German)" value={newLesson.title_de} onChange={(e) => setNewLesson({...newLesson, title_de: e.target.value})} required />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 20px 0' }}>
                <input type="checkbox" checked={newLesson.is_premium} onChange={(e) => setNewLesson({...newLesson, is_premium: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                <label style={{ fontWeight: '700', color: '#6366F1' }}>Require Premium</label>
              </div>
              <Button type="submit" style={{ width: '100%' }}>Create Lesson</Button>
            </form>
          </Card>
          <Card style={{ flex: 2, minWidth: '300px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>All Lessons</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left' }}><th style={{ padding: '12px' }}>Level</th><th style={{ padding: '12px' }}>Unit</th><th style={{ padding: '12px' }}>Title</th><th style={{ padding: '12px' }}>Premium</th><th style={{ padding: '12px' }}>Actions</th></tr></thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr key={lesson.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px', textTransform: 'uppercase', fontWeight: '900', color: lesson.level === 'a1' ? '#10B981' : '#6366F1' }}>{lesson.level}</td>
                    <td style={{ padding: '12px' }}>{lesson.unit}</td>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{lesson.title_so}</td>
                    <td style={{ padding: '12px' }}>{lesson.is_premium ? '💎 Yes' : 'Free'}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                      <Button variant="secondary" onClick={() => handleEditClick(lesson)} style={{ padding: '6px 12px', fontSize: '12px' }}>Edit</Button>
                      <Button variant="danger" onClick={() => handleDeleteLesson(lesson.id)} style={{ padding: '6px 12px', fontSize: '12px' }}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ACTIVITIES TAB */}
      {activeTab === 'activities' && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          {!editingActivity && (
            <Card style={{ flex: 1, minWidth: '300px', height: 'fit-content' }}>
              <h3 style={{ margin: '0 0 20px 0' }}>Create New Activity</h3>
              <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select value={newActivity.lesson_id} onChange={(e) => setNewActivity({...newActivity, lesson_id: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <option value="">Select Lesson...</option>
                  {lessons.map(l => <option key={l.id} value={l.id}>{l.level.toUpperCase()} - Unit {l.unit} - {l.title_so}</option>)}
                </select>
                <select value={newActivity.type} onChange={(e) => setNewActivity({...newActivity, type: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <option value="reading">Reading</option>
                  <option value="listening">Listening</option>
                  <option value="grammar">Grammar</option>
                  <option value="fill_blank">Vocabulary (Fill in the Blank)</option>
                </select>
                <Input type="text" placeholder="Title (Somali)" value={newActivity.title_so} onChange={(e) => setNewActivity({...newActivity, title_so: e.target.value})} required />
                <Input type="text" placeholder="Title (German)" value={newActivity.title_de} onChange={(e) => setNewActivity({...newActivity, title_de: e.target.value})} required />
                <Input type="text" placeholder="Image URL (Optional)" value={newActivity.image_url} onChange={(e) => setNewActivity({...newActivity, image_url: e.target.value})} />
                <Input type="text" placeholder="Audio URL (Optional)" value={newActivity.audio_url} onChange={(e) => setNewActivity({...newActivity, audio_url: e.target.value})} />
                <textarea placeholder="German Content..." value={newActivity.content_de} onChange={(e) => setNewActivity({...newActivity, content_de: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC' }} />
                <textarea placeholder="Somali Translation..." value={newActivity.content_so} onChange={(e) => setNewActivity({...newActivity, content_so: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC' }} />

                {newActivity.type === 'fill_blank' ? (
                  <div style={{ border: '2px solid #6366F1', padding: '15px', borderRadius: '10px', backgroundColor: '#EEF2FF' }}>
                    <Input type="text" placeholder="Word Bank (comma separated)" value={wordBank} onChange={(e) => setWordBank(e.target.value)} />
                    <Input type="text" placeholder="Sentence (use ___ for blank)" value={fbSentence} onChange={(e) => setFbSentence(e.target.value)} />
                    <Input type="text" placeholder="Answer" value={fbAnswer} onChange={(e) => setFbAnswer(e.target.value)} />
                    <Button type="button" variant="secondary" onClick={() => { if(fbSentence && fbAnswer) { setFillBlankQuestions([...fillBlankQuestions, { text: fbSentence, answer: fbAnswer }]); setFbSentence(''); setFbAnswer(''); } }}>+ Add Sentence</Button>
                    {fillBlankQuestions.map((q, i) => <div key={i} style={{ fontSize: '12px', marginTop: '8px', color: '#4F46E5', fontWeight: 'bold' }}>✓ {q.text}</div>)}
                  </div>
                ) : (
                  <div style={{ borderTop: '2px solid #F1F5F9', paddingTop: '15px' }}>
                    <Input type="text" placeholder="Question" value={newQ.question} onChange={(e) => setNewQ({...newQ, question: e.target.value})} />
                    <Input type="text" placeholder="Options (comma separated)" value={newQ.options} onChange={(e) => setNewQ({...newQ, options: e.target.value})} />
                    <Input type="text" placeholder="Correct Answer" value={newQ.answer} onChange={(e) => setNewQ({...newQ, answer: e.target.value})} />
                    <Button type="button" variant="secondary" onClick={handleAddQuestion}>+ Add Question</Button>
                    {activityQuestions.map((q, i) => <div key={i} style={{ fontSize: '12px', marginTop: '8px', color: '#4F46E5', fontWeight: 'bold' }}>✓ {q.question}</div>)}
                  </div>
                )}
                <Button type="submit" variant="success" style={{ marginTop: '10px' }}>Publish Activity</Button>
              </form>
            </Card>
          )}

          <Card style={{ flex: 1, minWidth: '300px' }}>
            {editingActivity ? (
              <div>
                <button onClick={() => setEditingActivity(null)} style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFF', fontWeight: '600' }}>← Back to List</button>
                <h3 style={{ margin: '0 0 20px 0' }}>Editing: {editingActivity.title_so}</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Input type="text" value={editingActivity.title_so} onChange={(e) => setEditingActivity({...editingActivity, title_so: e.target.value})} placeholder="Title Somali" />
                  <Input type="text" value={editingActivity.title_de} onChange={(e) => setEditingActivity({...editingActivity, title_de: e.target.value})} placeholder="Title German" />
                  <Input type="text" value={editingActivity.image_url || ''} onChange={(e) => setEditingActivity({...editingActivity, image_url: e.target.value})} placeholder="Image URL" />
                  <Input type="text" value={editingActivity.audio_url || ''} onChange={(e) => setEditingActivity({...editingActivity, audio_url: e.target.value})} placeholder="Audio URL" />
                  <textarea value={editingActivity.content_de} onChange={(e) => setEditingActivity({...editingActivity, content_de: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC' }} placeholder="Content German" />
                  <textarea value={editingActivity.content_so} onChange={(e) => setEditingActivity({...editingActivity, content_so: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC' }} placeholder="Content Somali" />
                  
                  <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #E2E8F0' }} />
                  <h4 style={{ margin: '0 0 10px 0' }}>Manage Questions</h4>
                  
                  {editingActivity.type === 'fill_blank' ? (
                    <div>
                      <h5 style={{ margin: '0 0 10px 0' }}>Sentences:</h5>
                      {(editingActivity.questions?.sentences || []).map((s, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '10px', marginBottom: '5px', borderRadius: '4px' }}>
                          <span>{s.text} ({s.answer})</span>
                          <button onClick={() => handleDeleteEditFbSentence(i)} style={{ color: '#F43F5E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexDirection: 'column' }}>
                        <Input type="text" placeholder="New Sentence (use ___ )" value={editFbSentence} onChange={(e) => setEditFbSentence(e.target.value)} />
                        <Input type="text" placeholder="Answer" value={editFbAnswer} onChange={(e) => setEditFbAnswer(e.target.value)} />
                        <Button variant="secondary" onClick={handleAddEditFbSentence}>Add Sentence</Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h5 style={{ margin: '0 0 10px 0' }}>Questions:</h5>
                      {(editingActivity.questions || []).map((q, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '10px', marginBottom: '5px', borderRadius: '4px' }}>
                          <span>{q.question}</span>
                          <button onClick={() => handleDeleteEditQuestion(i)} style={{ color: '#F43F5E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexDirection: 'column' }}>
                        <Input type="text" placeholder="New Question" value={editNewQ.question} onChange={(e) => setEditNewQ({...editNewQ, question: e.target.value})} />
                        <Input type="text" placeholder="Options (comma separated)" value={editNewQ.options} onChange={(e) => setEditNewQ({...editNewQ, options: e.target.value})} />
                        <Input type="text" placeholder="Answer" value={editNewQ.answer} onChange={(e) => setEditNewQ({...editNewQ, answer: e.target.value})} />
                        <Button variant="secondary" onClick={handleAddEditQuestion}>Add Question</Button>
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={handleUpdateActivity} variant="success" style={{ marginTop: '20px' }}>Save Changes</Button>
                  <Button onClick={() => handleDeleteActivity(editingActivity.id)} variant="danger" style={{ marginTop: '10px' }}>Delete Entire Activity</Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 style={{ margin: '0 0 20px 0' }}>Published Activities</h3>
                {Object.keys(groupedActivities).length === 0 && <p style={{ color: '#94A3B8', fontStyle: 'italic' }}>No activities created yet.</p>}
                
                {Object.keys(groupedActivities).map(lessonId => {
                  const lesson = lessons.find(l => l.id === lessonId);
                  const lessonActs = groupedActivities[lessonId];
                  
                  return (
                    <div key={lessonId} style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#4F46E5', borderBottom: '2px solid #EEF2FF', paddingBottom: '8px', margin: '0 0 10px 0' }}>{lesson ? lesson.title_so : lessonId}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {lessonActs.map(act => (
                          <div 
                            key={act.id} 
                            onClick={() => setEditingActivity(act)}
                            style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '10px', border: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = '#6366F1'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#F1F5F9'}
                          >
                            <div>
                              <strong style={{ textTransform: 'capitalize', color: '#0F172A' }}>{act.type.replace('_', ' ')}:</strong> <span style={{ color: '#64748B' }}>{act.title_so}</span>
                            </div>
                            <span style={{ color: '#6366F1', fontWeight: 'bold', fontSize: '14px' }}>Edit</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ARTICLES TAB */}
      {activeTab === 'articles' && (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <Card style={{ flex: 1, minWidth: '300px' }}>
            <h3>Create Article</h3>
            <form onSubmit={handleCreateArticle}>
              <Input type="text" placeholder="Title (SO)" value={newArticle.title_so} onChange={(e) => setNewArticle({...newArticle, title_so: e.target.value})} required />
              <Input type="text" placeholder="Title (DE)" value={newArticle.title_de} onChange={(e) => setNewArticle({...newArticle, title_de: e.target.value})} required />
              <input type="file" onChange={(e) => setImageFile(e.target.files[0])} style={{ marginBottom: '12px' }} />
              <textarea placeholder="Body (SO)" value={newArticle.body_so} onChange={(e) => setNewArticle({...newArticle, body_so: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '100px', marginBottom: '12px' }} />
              <textarea placeholder="Body (DE)" value={newArticle.body_de} onChange={(e) => setNewArticle({...newArticle, body_de: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '100px', marginBottom: '12px' }} />
              <Button type="submit" variant="success" disabled={uploading} style={{ width: '100%' }}>{uploading ? 'Uploading...' : 'Publish'}</Button>
            </form>
          </Card>
          <Card style={{ flex: 1, minWidth: '300px' }}>
            <h3>Published Articles</h3>
            {articles.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: '15px', borderBottom: '1px solid #F1F5F9', paddingBottom: '15px', marginBottom: '15px', alignItems: 'center' }}>
                {a.image_url && <img src={a.image_url} alt="cover" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />}
                <div style={{ flex: 1 }}><h4 style={{ margin: '0 0 5px 0' }}>{a.title_so}</h4><p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>{a.title_de}</p></div>
                <Button variant="danger" onClick={() => handleDeleteArticle(a.id)} style={{ padding: '6px 12px' }}>Delete</Button>
              </div>
            ))}
          </Card>
        </div>
      )}

    </div>
  );
}

export default App;