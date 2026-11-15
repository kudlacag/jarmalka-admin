import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const supabaseUrl = 'https://yycpkepjdgdvsixdtgth.supabase.co';
const supabaseKey = 'sb_publishable_hpYwrAyO67bLP1-wDhK-zg_mxXebufV';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- UI COMPONENTS ---
const Card = ({ children, style }) => (
  <div style={{ backgroundColor: '#FFF', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #F1F5F9', ...style }}>
    {children}
  </div>
);
const Input = (props) => <input {...props} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '16px', outline: 'none', backgroundColor: '#F8FAFC', marginBottom: '12px', boxSizing: 'border-box', ...props.style }} />;
const Button = ({ children, onClick, type = 'button', variant = 'primary', style }) => {
  const base = { padding: '12px 18px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' };
  const variants = {
    primary: { backgroundColor: '#6366F1', color: 'white' },
    danger: { backgroundColor: '#F43F5E', color: 'white' },
    secondary: { backgroundColor: '#F1F5F9', color: '#334155' },
    success: { backgroundColor: '#10B981', color: 'white' }
  };
  return <button type={type} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
};

// Helper: scrollable table wrapper for mobile
const TableWrap = ({ children }) => (
  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
    {children}
  </div>
);

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [activeTab, setActiveTab] = useState('lessons');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Data States
  const [users, setUsers] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [activities, setActivities] = useState([]);
  const [articles, setArticles] = useState([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [lessonLevelFilter, setLessonLevelFilter] = useState('A1');

  // Lesson Editing States
  const [editingLesson, setEditingLesson] = useState(null);
  const [vocabulary, setVocabulary] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [lessonActivities, setLessonActivities] = useState([]); 
  const [newDe, setNewDe] = useState('');
  const [newSo, setNewSo] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [newLesson, setNewLesson] = useState({ id: '', level: 'a1', unit: 1, title_so: '', title_de: '', is_premium: false, author_id: '' });

  // Activity States
  const [editingActivity, setEditingActivity] = useState(null);
  const [newActivity, setNewActivity] = useState({ lesson_id: '', type: 'reading', title_so: '', title_de: '', content_so: '', content_de: '', image_url: '', audio_url: '' });
  const [wordBank, setWordBank] = useState('');
  const [fbSentence, setFbSentence] = useState('');
  const [fbAnswer, setFbAnswer] = useState('');
  const [fillBlankQuestions, setFillBlankQuestions] = useState([]);
  const [activityQuestions, setActivityQuestions] = useState([]);
  const [newQ, setNewQ] = useState({ question: '', options: '', answer: '' });
  const [editNewQ, setEditNewQ] = useState({ question: '', options: '', answer: '' });
  const [editFbSentence, setEditFbSentence] = useState('');
  const [editFbAnswer, setEditFbAnswer] = useState('');

  // Article States
  const [newArticle, setNewArticle] = useState({ title_so: '', title_de: '', body_so: '', body_de: '', author_id: '' });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Responsive listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth & Role setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(userId) {
    const { data } = await supabase.from('user_stats').select('role').eq('user_id', userId).single();
    if (data && data.role) setUserRole(data.role);
    else setUserRole('user'); 
  }

  useEffect(() => {
    if (session) {
      fetchLessons();
      fetchActivities();
      if (userRole === 'admin') fetchUsers();
      if (userRole === 'admin' || userRole === 'news_editor') fetchArticles();
    }
  }, [session, activeTab, userRole]);

  // --- FETCH FUNCTIONS ---
  async function fetchUsers() { const { data } = await supabase.rpc('get_admin_users'); if (data) setUsers(data); }
  async function fetchLessons() { const { data } = await supabase.from('lessons').select('*').order('level').order('unit'); if (data) setLessons(data); }
  async function fetchActivities() { const { data } = await supabase.from('activities').select('*'); if (data) setActivities(data); }
  async function fetchArticles() { const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false }); if (data) setArticles(data); }

  // --- ROLE MANAGEMENT ---
  async function updateUserRole(userId, newRole) {
    const { error } = await supabase.from('user_stats').update({ role: newRole }).eq('user_id', userId);
    if (!error) fetchUsers();
    else alert("Error updating role: " + error.message);
  }

  // --- LESSON FUNCTIONS ---
  async function handleCreateLesson(e) {
    e.preventDefault();
    if (userRole === 'a1_editor' && lessonLevelFilter !== 'A1') {
      return alert("You only have permission to create A1 lessons.");
    }
    const { error } = await supabase.from('lessons').insert({ ...newLesson, level: lessonLevelFilter.toLowerCase(), author_id: session?.user?.id });
    if (!error) {
      alert("Lesson created!");
      setNewLesson({ id: '', level: 'a1', unit: 1, title_so: '', title_de: '', is_premium: false, author_id: '' });
      fetchLessons();
    } else alert("Error: " + error.message);
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
    const { error } = await supabase.from('articles').insert({ ...newArticle, image_url: imageUrl, author_id: session?.user?.id });
    if (!error) { alert("Article published!"); setNewArticle({ title_so: '', title_de: '', body_so: '', body_de: '', author_id: '' }); setImageFile(null); fetchArticles(); }
    setUploading(false);
  }
  async function handleDeleteArticle(id) {
    if (!window.confirm("Delete this article?")) return;
    await supabase.from('articles').delete().eq('id', id); fetchArticles();
  }

  // --- FILTERS ---
  const filteredLessons = lessons.filter(l => {
    const matchesSearch = l.title_so.toLowerCase().includes(searchQuery.toLowerCase()) || l.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (userRole === 'a1_editor' && l.level !== 'a1') return false;
    const matchesLevel = userRole === 'a1_editor' ? true : l.level === lessonLevelFilter.toLowerCase();
    return matchesSearch && matchesLevel;
  });

  const filteredArticles = articles.filter(a => {
    if (userRole === 'admin') return true;
    return a.author_id === session?.user?.id;
  });

  const groupedActivities = activities.reduce((acc, act) => { if (!acc[act.lesson_id]) acc[act.lesson_id] = []; acc[act.lesson_id].push(act); return acc; }, {});

  // Tab definitions (used for both sidebar and mobile bottom nav)
  const allTabs = [
    { key: 'users', label: 'Users', icon: '👥', roles: ['admin'] },
    { key: 'lessons', label: 'Lessons', icon: '📚', roles: ['admin', 'a1_editor'] },
    { key: 'activities', label: 'Activities', icon: '✏️', roles: ['admin', 'a1_editor'] },
    { key: 'articles', label: 'Articles', icon: '📰', roles: ['admin', 'news_editor'] },
  ];
  const visibleTabs = allTabs.filter(t => t.roles.includes(userRole));

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0F172A', padding: '20px', boxSizing: 'border-box' }}>
        <form onSubmit={async (e) => { e.preventDefault(); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setError(error.message); }} style={{ background: '#1E293B', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px', color: 'white' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '26px', fontWeight: '900' }}>Jarmalka Admin</h1>
          {error && <p style={{ color: '#F43F5E', textAlign: 'center', background: '#450a0a', padding: '10px', borderRadius: '8px', fontSize: '14px' }}>{error}</p>}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', marginBottom: '15px', background: '#334155', color: 'white', fontSize: '16px', boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', marginBottom: '20px', background: '#334155', color: 'white', fontSize: '16px', boxSizing: 'border-box' }} />
          <Button type="submit" style={{ width: '100%' }}>Login</Button>
        </form>
      </div>
    );
  }

  // --- RENDER EDIT LESSON ---
  if (editingLesson) {
    const canEdit = userRole === 'admin' || (userRole === 'a1_editor' && editingLesson.author_id === session?.user?.id && editingLesson.level === 'a1');
    if (!canEdit) {
      return <div style={{ padding: '40px', textAlign: 'center', fontSize: '18px', color: '#F43F5E', fontWeight: 'bold' }}>Access Denied: You do not have permission to edit this lesson.</div>;
    }

    return (
      <div style={{ padding: isMobile ? '20px' : '40px', backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box' }}>
        <button onClick={() => setEditingLesson(null)} style={{ marginBottom: '20px', padding: '10px 16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFF', fontWeight: '600', fontSize: '14px' }}>← Back</button>
        
        <Card style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: isMobile ? '20px' : '24px', color: '#0F172A', wordBreak: 'break-word' }}>Edit: {editingLesson.id}</h2>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ flex: 1, width: isMobile ? '100%' : 'auto', minWidth: '80px' }}><label style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Unit</label><Input type="number" value={editingLesson.unit} onChange={(e) => setEditingLesson({...editingLesson, unit: parseInt(e.target.value)})} /></div>
            <div style={{ flex: 2, width: isMobile ? '100%' : 'auto' }}><label style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Title (Somali)</label><Input type="text" value={editingLesson.title_so} onChange={(e) => setEditingLesson({...editingLesson, title_so: e.target.value})} /></div>
            <div style={{ flex: 2, width: isMobile ? '100%' : 'auto' }}><label style={{ fontWeight: '600', fontSize: '13px', marginBottom: '6px', display: 'block' }}>Title (German)</label><Input type="text" value={editingLesson.title_de} onChange={(e) => setEditingLesson({...editingLesson, title_de: e.target.value})} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: isMobile ? '0' : '12px' }}>
              <input type="checkbox" checked={editingLesson.is_premium} onChange={(e) => setEditingLesson({...editingLesson, is_premium: e.target.checked})} style={{ width: '20px', height: '20px' }} />
              <label style={{ fontWeight: '700', color: '#6366F1' }}>Premium</label>
            </div>
          </div>
          <Button onClick={handleSaveLesson} style={{ marginTop: '20px', width: isMobile ? '100%' : 'auto' }}>Save Details</Button>
        </Card>

        <Card style={{ marginBottom: '20px', borderLeft: '4px solid #F59E0B' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '17px' }}>Activities ({lessonActivities.length})</h3>
          {lessonActivities.map(act => (
            <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '8px', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', flex: 1 }}><strong>{act.type.replace('_', ' ')}:</strong> {act.title_so}</span>
              <button onClick={() => { if(window.confirm("Delete?")) supabase.from('activities').delete().eq('id', act.id).then(() => setLessonActivities(lessonActivities.filter(a => a.id !== act.id))); }} style={{ color: '#F43F5E', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Delete</button>
            </div>
          ))}
        </Card>

        <Card style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '17px' }}>Vocabulary</h3>
          <form onSubmit={handleAddVocab} style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
            <Input type="text" placeholder="German Word" value={newDe} onChange={(e) => setNewDe(e.target.value)} required style={{ flex: 1, marginBottom: isMobile ? '0' : '12px' }} />
            <Input type="text" placeholder="Somali Translation" value={newSo} onChange={(e) => setNewSo(e.target.value)} required style={{ flex: 1, marginBottom: isMobile ? '0' : '12px' }} />
            <Button type="submit" variant="success" style={{ width: isMobile ? '100%' : 'auto', marginBottom: isMobile ? '12px' : '0' }}>Add</Button>
          </form>
          <div style={{ marginTop: '15px' }}>
            {vocabulary.map(v => (
              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #F1F5F9', fontSize: '14px', gap: '10px' }}>
                <span><b>{v.de}</b> — {v.so}</span>
                <button onClick={() => handleDeleteVocab(v.id)} style={{ color: '#F43F5E', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '17px' }}>Sentence Exercises</h3>
          <form onSubmit={handleAddExercise} style={{ display: 'flex', gap: '10px', flexDirection: 'column', marginBottom: '20px' }}>
            <Input type="text" placeholder="Prompt (Somali)" value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} required />
            <Input type="text" placeholder="Correct Answer (German)" value={newCorrectAnswer} onChange={(e) => setNewCorrectAnswer(e.target.value)} required />
            <Input type="text" placeholder="Options (comma separated)" value={newOptions} onChange={(e) => setNewOptions(e.target.value)} required />
            <Button type="submit" variant="success">Add Exercise</Button>
          </form>
          {exercises.map(ex => (
            <div key={ex.id} style={{ padding: '10px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: '14px', gap: '10px' }}>
              <span>{ex.prompt} — <b>{ex.correct_answer}</b></span>
              <button onClick={() => handleDeleteExercise(ex.id)} style={{ color: '#F43F5E', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // --- MAIN DASHBOARD ---
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* DESKTOP SIDEBAR (hidden on mobile) */}
      {!isMobile && (
        <div style={{ width: '250px', backgroundColor: '#0F172A', color: 'white', padding: '30px 20px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '40px', letterSpacing: '-1px' }}>Jarmalka CMS</h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleTabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '12px', borderRadius: '8px', background: activeTab === tab.key ? '#6366F1' : 'transparent', color: 'white', border: 'none', textAlign: 'left', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 'auto', fontSize: '12px', color: '#64748B' }}>
            <p style={{ wordBreak: 'break-all' }}>Logged in as: <br/><b style={{ color: 'white' }}>{session.user.email}</b></p>
            <p>Role: <b style={{ color: '#10B981', textTransform: 'uppercase' }}>{userRole}</b></p>
            <Button onClick={() => supabase.auth.signOut()} variant="danger" style={{ width: '100%', marginTop: '10px' }}>Logout</Button>
          </div>
        </div>
      )}

      {/* MOBILE TOP HEADER */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', backgroundColor: '#0F172A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Jarmalka CMS</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '10px', backgroundColor: '#10B981', color: 'white', padding: '3px 8px', borderRadius: '6px', fontWeight: '900', textTransform: 'uppercase' }}>{userRole}</span>
            <button onClick={() => supabase.auth.signOut()} style={{ padding: '8px 12px', background: '#F43F5E', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', backgroundColor: '#0F172A', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 100, borderTop: '1px solid #1E293B', paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'content-box' }}>
          {visibleTabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', cursor: 'pointer', flex: 1, height: '100%',
                  color: active ? '#6366F1' : '#94A3B8', gap: '4px', padding: '8px 4px', boxSizing: 'border-box',
                }}
              >
                <span style={{ fontSize: '22px', filter: active ? 'none' : 'grayscale(0.7) opacity(0.7)' }}>{tab.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: active ? '900' : '600' }}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ 
        flex: 1, 
        padding: isMobile ? '76px 16px 90px 16px' : '40px', 
        overflowY: 'auto', 
        boxSizing: 'border-box',
        minWidth: 0,
      }}>
        
        {/* ACCESS DENIED CHECK */}
        {!visibleTabs.some(t => t.key === activeTab) && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <h2 style={{ color: '#F43F5E', fontSize: '22px', fontWeight: 'bold' }}>Access Denied</h2>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && userRole === 'admin' && (
          <Card>
            <h2 style={{ margin: '0 0 20px 0', fontSize: isMobile ? '20px' : '24px' }}>User Management</h2>
            <TableWrap>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left' }}>
                    <th style={{ padding: '12px', fontSize: '13px' }}>Email</th>
                    <th style={{ padding: '12px', fontSize: '13px' }}>Role</th>
                    <th style={{ padding: '12px', fontSize: '13px' }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '13px', wordBreak: 'break-all' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ backgroundColor: u.role === 'admin' ? '#FEF3C7' : u.role === 'user' ? '#F1F5F9' : '#ECFDF5', color: u.role === 'admin' ? '#D97706' : u.role === 'user' ? '#64748B' : '#10B981', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select value={u.role || 'user'} onChange={(e) => updateUserRole(u.user_id, e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                          <option value="user">User</option>
                          <option value="news_editor">News Editor</option>
                          <option value="a1_editor">A1 Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        )}

        {/* LESSONS TAB */}
        {activeTab === 'lessons' && (userRole === 'admin' || userRole === 'a1_editor') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '6px', borderRadius: '12px' }}>
                {['A1', 'A2', 'B1'].map(level => {
                  const isDisabled = userRole === 'a1_editor' && level !== 'A1';
                  return (
                    <button key={level} disabled={isDisabled} onClick={() => setLessonLevelFilter(level)} style={{ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: isDisabled ? 'not-allowed' : 'pointer', backgroundColor: lessonLevelFilter === level ? '#FFF' : 'transparent', boxShadow: lessonLevelFilter === level ? '0 2px 10px rgba(0,0,0,0.05)' : 'none', color: isDisabled ? '#CBD5E1' : lessonLevelFilter === level ? '#0F172A' : '#64748B', fontSize: '14px' }}>
                      {level}
                    </button>
                  );
                })}
              </div>
              <Input placeholder="🔍 Search lessons..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ marginBottom: 0, width: isMobile ? '100%' : '300px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column-reverse' : 'row', gap: '20px' }}>
              <Card style={{ flex: 2, minWidth: 0 }}>
                <TableWrap>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
                    <thead><tr style={{ borderBottom: '2px solid #F1F5F9', textAlign: 'left' }}><th style={{ padding: '10px', fontSize: '13px' }}>Unit</th><th style={{ padding: '10px', fontSize: '13px' }}>Title</th><th style={{ padding: '10px', fontSize: '13px' }}>Type</th><th style={{ padding: '10px', fontSize: '13px' }}>Actions</th></tr></thead>
                    <tbody>
                      {filteredLessons.map((lesson) => {
                        const canEdit = userRole === 'admin' || (userRole === 'a1_editor' && lesson.author_id === session?.user?.id);
                        return (
                          <tr key={lesson.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px', fontWeight: '900', color: '#6366F1', fontSize: '13px' }}>{lesson.unit}</td>
                            <td style={{ padding: '10px', fontWeight: '600', fontSize: '13px' }}>{lesson.title_so}</td>
                            <td style={{ padding: '10px', fontSize: '13px' }}>{lesson.is_premium ? '💎' : 'Free'}</td>
                            <td style={{ padding: '10px', display: 'flex', gap: '6px' }}>
                              {canEdit ? (
                                <>
                                  <Button variant="secondary" onClick={() => handleEditClick(lesson)} style={{ padding: '6px 10px', fontSize: '12px' }}>Edit</Button>
                                  <Button variant="danger" onClick={async () => { if(window.confirm("Delete?")) { await supabase.from('lessons').delete().eq('id', lesson.id); fetchLessons(); } }} style={{ padding: '6px 10px', fontSize: '12px' }}>Del</Button>
                                </>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>Read Only</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrap>
              </Card>

              <Card style={{ flex: 1, height: 'fit-content' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '17px' }}>Create {lessonLevelFilter} Lesson</h3>
                <form onSubmit={handleCreateLesson}>
                  <Input placeholder="ID (e.g., a1-01-vacation)" value={newLesson.id} onChange={(e) => setNewLesson({...newLesson, id: e.target.value})} required />
                  <Input type="number" placeholder="Unit Number" value={newLesson.unit} onChange={(e) => setNewLesson({...newLesson, unit: parseInt(e.target.value)})} required />
                  <Input placeholder="Title (Somali)" value={newLesson.title_so} onChange={(e) => setNewLesson({...newLesson, title_so: e.target.value})} required />
                  <Input placeholder="Title (German)" value={newLesson.title_de} onChange={(e) => setNewLesson({...newLesson, title_de: e.target.value})} required />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
                    <input type="checkbox" checked={newLesson.is_premium} onChange={(e) => setNewLesson({...newLesson, is_premium: e.target.checked})} style={{ width: '20px', height: '20px' }} />
                    <label style={{ fontSize: '14px' }}>Require Premium</label>
                  </div>
                  <Button type="submit" style={{ width: '100%' }}>Create Lesson</Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (userRole === 'admin' || userRole === 'a1_editor') && (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', flexWrap: 'wrap' }}>
            {!editingActivity && (
              <Card style={{ flex: 1, minWidth: isMobile ? '100%' : '300px', height: 'fit-content' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '17px' }}>Create Activity</h3>
                <form onSubmit={handleCreateActivity} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select value={newActivity.lesson_id} onChange={(e) => setNewActivity({...newActivity, lesson_id: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '15px' }}>
                    <option value="">Select Lesson...</option>
                    {lessons.map(l => <option key={l.id} value={l.id}>{l.level.toUpperCase()} - {l.title_so}</option>)}
                  </select>
                  <select value={newActivity.type} onChange={(e) => setNewActivity({...newActivity, type: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '15px' }}>
                    <option value="reading">Reading</option>
                    <option value="listening">Listening</option>
                    <option value="grammar">Grammar</option>
                    <option value="fill_blank">Fill in the Blank</option>
                  </select>
                  <Input placeholder="Title (Somali)" value={newActivity.title_so} onChange={(e) => setNewActivity({...newActivity, title_so: e.target.value})} required />
                  <Input placeholder="Title (German)" value={newActivity.title_de} onChange={(e) => setNewActivity({...newActivity, title_de: e.target.value})} required />
                  <Input placeholder="Image URL (Optional)" value={newActivity.image_url} onChange={(e) => setNewActivity({...newActivity, image_url: e.target.value})} />
                  <Input placeholder="Audio URL (Optional)" value={newActivity.audio_url} onChange={(e) => setNewActivity({...newActivity, audio_url: e.target.value})} />
                  <textarea placeholder="German Content..." value={newActivity.content_de} onChange={(e) => setNewActivity({...newActivity, content_de: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  <textarea placeholder="Somali Translation..." value={newActivity.content_so} onChange={(e) => setNewActivity({...newActivity, content_so: e.target.value})} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }} />

                  {newActivity.type === 'fill_blank' ? (
                    <div style={{ border: '2px solid #6366F1', padding: '15px', borderRadius: '10px', backgroundColor: '#EEF2FF' }}>
                      <Input placeholder="Word Bank (comma separated)" value={wordBank} onChange={(e) => setWordBank(e.target.value)} />
                      <Input placeholder="Sentence (use ___ for blank)" value={fbSentence} onChange={(e) => setFbSentence(e.target.value)} />
                      <Input placeholder="Answer" value={fbAnswer} onChange={(e) => setFbAnswer(e.target.value)} />
                      <Button type="button" variant="secondary" onClick={() => { if(fbSentence && fbAnswer) { setFillBlankQuestions([...fillBlankQuestions, { text: fbSentence, answer: fbAnswer }]); setFbSentence(''); setFbAnswer(''); } }}>+ Add Sentence</Button>
                      {fillBlankQuestions.map((q, i) => <div key={i} style={{ fontSize: '12px', marginTop: '8px', color: '#4F46E5', fontWeight: 'bold' }}>✓ {q.text}</div>)}
                    </div>
                  ) : (
                    <div style={{ borderTop: '2px solid #F1F5F9', paddingTop: '15px' }}>
                      <Input placeholder="Question" value={newQ.question} onChange={(e) => setNewQ({...newQ, question: e.target.value})} />
                      <Input placeholder="Options (comma separated)" value={newQ.options} onChange={(e) => setNewQ({...newQ, options: e.target.value})} />
                      <Input placeholder="Correct Answer" value={newQ.answer} onChange={(e) => setNewQ({...newQ, answer: e.target.value})} />
                      <Button type="button" variant="secondary" onClick={handleAddQuestion}>+ Add Question</Button>
                      {activityQuestions.map((q, i) => <div key={i} style={{ fontSize: '12px', marginTop: '8px', color: '#4F46E5', fontWeight: 'bold' }}>✓ {q.question}</div>)}
                    </div>
                  )}
                  <Button type="submit" variant="success" style={{ marginTop: '10px' }}>Publish Activity</Button>
                </form>
              </Card>
            )}

            <Card style={{ flex: 1, minWidth: isMobile ? '100%' : '300px' }}>
              {editingActivity ? (
                <div>
                  <button onClick={() => setEditingActivity(null)} style={{ marginBottom: '20px', padding: '10px 16px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFF', fontWeight: '600', fontSize: '14px' }}>← Back</button>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '17px' }}>Editing: {editingActivity.title_so}</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Input type="text" value={editingActivity.title_so} onChange={(e) => setEditingActivity({...editingActivity, title_so: e.target.value})} placeholder="Title Somali" />
                    <Input type="text" value={editingActivity.title_de} onChange={(e) => setEditingActivity({...editingActivity, title_de: e.target.value})} placeholder="Title German" />
                    <Input type="text" value={editingActivity.image_url || ''} onChange={(e) => setEditingActivity({...editingActivity, image_url: e.target.value})} placeholder="Image URL" />
                    <Input type="text" value={editingActivity.audio_url || ''} onChange={(e) => setEditingActivity({...editingActivity, audio_url: e.target.value})} placeholder="Audio URL" />
                    <textarea value={editingActivity.content_de} onChange={(e) => setEditingActivity({...editingActivity, content_de: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Content German" />
                    <textarea value={editingActivity.content_so} onChange={(e) => setEditingActivity({...editingActivity, content_so: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '80px', backgroundColor: '#F8FAFC', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }} placeholder="Content Somali" />
                    
                    <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #E2E8F0' }} />
                    <h4 style={{ margin: '0 0 10px 0' }}>Manage Questions</h4>
                    
                    {editingActivity.type === 'fill_blank' ? (
                      <div>
                        <h5 style={{ margin: '0 0 10px 0' }}>Sentences:</h5>
                        {(editingActivity.questions?.sentences || []).map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '10px', marginBottom: '5px', borderRadius: '4px', gap: '10px', fontSize: '14px' }}>
                            <span>{s.text} ({s.answer})</span>
                            <button onClick={() => handleDeleteEditFbSentence(i)} style={{ color: '#F43F5E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexDirection: 'column' }}>
                          <Input type="text" placeholder="New Sentence (use ___ )" value={editFbSentence} onChange={(e) => setEditFbSentence(e.target.value)} />
                          <Input type="text" placeholder="Answer" value={editFbAnswer} onChange={(e) => setEditFbAnswer(e.target.value)} />
                          <Button variant="secondary" onClick={handleAddEditFbSentence}>Add Sentence</Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h5 style={{ margin: '0 0 10px 0' }}>Questions:</h5>
                        {(editingActivity.questions || []).map((q, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: '10px', marginBottom: '5px', borderRadius: '4px', gap: '10px', fontSize: '14px' }}>
                            <span>{q.question}</span>
                            <button onClick={() => handleDeleteEditQuestion(i)} style={{ color: '#F43F5E', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexDirection: 'column' }}>
                          <Input type="text" placeholder="New Question" value={editNewQ.question} onChange={(e) => setEditNewQ({...editNewQ, question: e.target.value})} />
                          <Input type="text" placeholder="Options (comma separated)" value={editNewQ.options} onChange={(e) => setEditNewQ({...editNewQ, options: e.target.value})} />
                          <Input type="text" placeholder="Answer" value={editNewQ.answer} onChange={(e) => setEditNewQ({...editNewQ, answer: e.target.value})} />
                          <Button variant="secondary" onClick={handleAddEditQuestion}>Add Question</Button>
                        </div>
                      </div>
                    )}
                    
                    <Button onClick={handleUpdateActivity} variant="success" style={{ marginTop: '20px' }}>Save Changes</Button>
                    <Button onClick={() => handleDeleteActivity(editingActivity.id)} variant="danger" style={{ marginTop: '10px' }}>Delete Activity</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '17px' }}>Published Activities</h3>
                  {Object.keys(groupedActivities).length === 0 && <p style={{ color: '#94A3B8', fontStyle: 'italic' }}>No activities yet.</p>}
                  
                  {Object.keys(groupedActivities).map(lessonId => {
                    const lesson = lessons.find(l => l.id === lessonId);
                    const lessonActs = groupedActivities[lessonId];
                    return (
                      <div key={lessonId} style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: '#4F46E5', borderBottom: '2px solid #EEF2FF', paddingBottom: '8px', margin: '0 0 10px 0', fontSize: '14px' }}>{lesson ? lesson.title_so : lessonId}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {lessonActs.map(act => (
                            <div 
                              key={act.id} 
                              onClick={() => setEditingActivity(act)}
                              style={{ backgroundColor: '#F8FAFC', padding: '15px', borderRadius: '10px', border: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '14px' }}
                            >
                              <div>
                                <strong style={{ textTransform: 'capitalize', color: '#0F172A' }}>{act.type.replace('_', ' ')}:</strong> <span style={{ color: '#64748B' }}>{act.title_so}</span>
                              </div>
                              <span style={{ color: '#6366F1', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap' }}>Edit</span>
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
        {activeTab === 'articles' && (userRole === 'admin' || userRole === 'news_editor') && (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
            <Card style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '17px' }}>Create Article</h3>
              <form onSubmit={handleCreateArticle}>
                <Input placeholder="Title (SO)" value={newArticle.title_so} onChange={(e) => setNewArticle({...newArticle, title_so: e.target.value})} required />
                <Input placeholder="Title (DE)" value={newArticle.title_de} onChange={(e) => setNewArticle({...newArticle, title_de: e.target.value})} required />
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ marginBottom: '12px', width: '100%', fontSize: '14px' }} />
                <textarea placeholder="Body (SO)" value={newArticle.body_so} onChange={(e) => setNewArticle({...newArticle, body_so: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '120px', marginBottom: '12px', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <textarea placeholder="Body (DE)" value={newArticle.body_de} onChange={(e) => setNewArticle({...newArticle, body_de: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', minHeight: '120px', marginBottom: '12px', fontSize: '15px', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <Button type="submit" variant="success" disabled={uploading} style={{ width: '100%' }}>{uploading ? 'Uploading...' : 'Publish Article'}</Button>
              </form>
            </Card>
            
            <Card style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '17px' }}>Your Articles ({filteredArticles.length})</h3>
              {filteredArticles.map(a => {
                const canDelete = userRole === 'admin' || a.author_id === session?.user?.id;
                return (
                  <div key={a.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #F1F5F9', paddingBottom: '15px', marginBottom: '15px', alignItems: 'center' }}>
                    {a.image_url && <img src={a.image_url} alt="cover" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}><h4 style={{ margin: '0 0 5px 0', fontSize: '14px', wordBreak: 'break-word' }}>{a.title_so}</h4><p style={{ margin: 0, fontSize: '12px', color: '#64748B', wordBreak: 'break-word' }}>{a.title_de}</p></div>
                    {canDelete && (
                      <Button variant="danger" onClick={async () => { if(window.confirm("Delete?")) { await supabase.from('articles').delete().eq('id', a.id); fetchArticles(); } }} style={{ padding: '6px 10px', fontSize: '12px', flexShrink: 0 }}>Del</Button>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}