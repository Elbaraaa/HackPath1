'use client';
import { useState, useEffect, useRef } from 'react';

import { Course, PlanResult, ToastMsg } from '@/types';
import { LOAD_MSGS } from '@/constants';
import { exportCSV } from '@/utils/export';
import Toast from '@/components/Toast';
import AdvisorMode from '@/components/AdvisorMode';
import InterestChatbot from '@/components/InterestChatbot';
import {
  SparkIcon, GradIcon, FileIcon, WarnIcon,
  DlIcon, ResetIcon, BookIcon, ClockIcon, HeartIcon,
} from '@/components/Icons';

const DEGREE_PROGRAMS = ['Bachelor of Science in Computer Science'];
const SECONDARY_PROGRAMS = [
  'Mathematics Minor',
  'Statistics & Data Science Minor',
  'Cybersecurity Focus',
  'Business Minor'
];

type ElectiveContext = {
  termIndex: number;
  courseIndex: number;
  requirement?: string;
  requirementTitle?: string;
  options: string[];
};

type AdvisorPick = {
  code: string;
  title?: string;
  reason?: string;
  match?: number;
  syllabus?: string;
};

type ReportSnapshot = {
  snapshotId: number;
  student?: {
    name?: string | null;
    studentId?: string | null;
    preparedOn?: string | null;
  };
  requirementCount?: number;
  courseAttemptCount?: number;
};

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    studentId: '',
    password: '',
    studentType: 'domestic' as 'domestic' | 'international'
  });
  const [uploadingTranscript, setUploadingTranscript] = useState(false);
  const transcriptFileRef = useRef<HTMLInputElement>(null);
  const [appMode, setAppMode]   = useState<'student' | 'advisor'>('student');
  const [advTab, setAdvTab]     = useState<'tools' | 'chatbot'>('tools');
  const [courses, setCourses]   = useState<Course[]>([]);
  const [courseTotal, setCourseTotal] = useState(0);
  const [loadingMoreCourses, setLoadingMoreCourses] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [profile, setProfile]   = useState({
    studentName: '',
    studentEmail: '',
    studentId: '',
    studentType: 'domestic' as 'domestic' | 'international',
    finalTermApproval: false,
    standing: 'Junior',
    major: DEGREE_PROGRAMS[0],
    secondMajor: '',
    gradTerm: 'Spring 2027',
    maxUnits: 16,
    summer: false
  });
  const [transcript, setTx]     = useState('');
  const [reportSnapshot, setReportSnapshot] = useState<ReportSnapshot | null>(null);
  const [txTab, setTxTab]       = useState('paste');
  const [result, setResult]     = useState<PlanResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [loadIdx, setLoadIdx]   = useState(0);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState<ToastMsg | null>(null);
  const [modalCourse, setModalCourse] = useState<any>(null);
  const [electiveContext, setElectiveContext] = useState<ElectiveContext | null>(null);
  const [electiveRecommendations, setElectiveRecommendations] = useState<Record<string, AdvisorPick[]>>({});
  const [collapsedElectiveRecommendations, setCollapsedElectiveRecommendations] = useState<Record<string, boolean>>({});
  const sliderRef               = useRef<HTMLInputElement>(null);

  const sp = (k: string, v: any) => setProfile(p => ({ ...p, [k]: v }));
  const showToast = (title: string, desc: string, type: string) => setToast({ title, desc, type: type as any });
  const updateAuth = (k: string, v: string) => setAuthForm(f => ({ ...f, [k]: v } as typeof f));
  const electiveSlotKey = (termIndex: number, courseIndex: number, requirement?: string) =>
    `${termIndex}:${courseIndex}:${requirement || ''}`;

  const handleAuthSubmit = (e: any) => {
    e.preventDefault();
    setProfile(p => ({
      ...p,
      studentName: authMode === 'signup' ? authForm.name : p.studentName,
      studentEmail: authForm.email || p.studentEmail,
      studentId: authMode === 'signup' ? authForm.studentId : p.studentId,
      studentType: authMode === 'signup' ? authForm.studentType : p.studentType
    }));
    setAuthenticated(true);
    showToast(authMode === 'signup' ? 'Account created' : 'Signed in', 'Welcome to MajorLyte.', 'success');
  };

  const handleTranscriptPdf = async (file: File) => {
    setUploadingTranscript(true);
    setError('');
  
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('major', profile.major);
  
      const res = await fetch('/api/transcript', {
        method: 'POST',
        body: fd,
      });
  
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Advisement report upload failed');
  
      setTx(data.text || '');
      setReportSnapshot({
        snapshotId: data.snapshotId,
        student: data.student,
        requirementCount: data.requirementCount,
        courseAttemptCount: data.courseAttemptCount
      });
      if (data.student?.name || data.student?.studentId) {
        setProfile(p => ({
          ...p,
          studentName: data.student?.name || p.studentName,
          studentId: data.student?.studentId || p.studentId
        }));
      }
      showToast('Advisement report imported', `Snapshot ${data.snapshotId} was created from this report.`, 'success');
      setTxTab('paste');
    } catch (e: any) {
      setError(e.message);
      showToast('Upload error', e.message, 'error');
    } finally {
      setUploadingTranscript(false);
    }
  };

  // Load courses from DB on mount
  useEffect(() => {
    loadCoursesPage({ reset: true });
  }, []);

  const loadCoursesPage = async ({
    reset = false,
    q = courseSearch
  }: { reset?: boolean; q?: string } = {}) => {
    if (loadingMoreCourses || (!reset && courses.length >= courseTotal)) return;
    setLoadingMoreCourses(true);
    try {
      const offset = reset ? 0 : courses.length;
      const query = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : '';
      const res = await fetch(`/api/courses?offset=${offset}&limit=200${query}`);
      const data = await res.json();
      const nextCourses: Course[] = data.courses || [];
      setCourses(existing => {
        if (reset) return nextCourses;
        const seen = new Set(existing.map(c => c.id));
        return [...existing, ...nextCourses.filter(c => !seen.has(c.id))];
      });
      setCourseTotal(data.total || nextCourses.length);
      setCourseSearch(q);
    } finally {
      setLoadingMoreCourses(false);
    }
  };

  const loadMoreCourses = async () => {
    if (courses.length >= courseTotal) return;
    await loadCoursesPage();
  };

  // Cycle loading messages
  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setLoadIdx(i => (i + 1) % LOAD_MSGS.length), 900);
    return () => clearInterval(iv);
  }, [loading]);

  // Sync slider CSS custom property
  useEffect(() => {
    if (sliderRef.current) sliderRef.current.style.setProperty('--v', String(profile.maxUnits));
  }, [profile.maxUnits]);

  const gradTerms: string[] = [];
  for (let y = 2026; y <= 2031; y++) { gradTerms.push(`Spring ${y}`, `Fall ${y}`); }
  const availMajors = DEGREE_PROGRAMS;

  const generate = async () => {
    setLoading(true); setResult(null); setError('');
    try {
      const reportText = transcript.trim();
      if (!reportText && !reportSnapshot?.snapshotId) {
        throw new Error('Paste or upload an advisement report before generating a plan.');
      }

      const res  = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'advisement-report',
          snapshotId: reportSnapshot?.snapshotId,
          transcriptText: reportSnapshot?.snapshotId ? undefined : reportText,
          gradTerm: profile.gradTerm,
          maxUnits: profile.maxUnits,
          includeSummer: profile.summer,
          major: profile.major,
          secondMajor: profile.secondMajor || undefined,
          standing: profile.standing,
          studentName: profile.studentName || undefined,
          studentEmail: profile.studentEmail || undefined,
          studentId: profile.studentId || undefined,
          studentType: profile.studentType,
          finalTermApproval: profile.finalTermApproval
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
      setElectiveRecommendations({});
      setCollapsedElectiveRecommendations({});
      if (data.sourceSnapshot?.snapshotId) {
        setReportSnapshot({
          snapshotId: data.sourceSnapshot.snapshotId,
          student: data.sourceSnapshot.student,
          requirementCount: data.sourceSnapshot.requirementCount,
          courseAttemptCount: data.sourceSnapshot.courseAttemptCount
        });
      }
      showToast('Plan generated', 'Roadmap is based on the current advisement report.', 'success');
    } catch (e: any) { setError(e.message); showToast('Error', e.message, 'error'); }
    finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setTx(''); setReportSnapshot(null); setElectiveRecommendations({}); setCollapsedElectiveRecommendations({}); setError(''); showToast('Reset', '', 'info'); };
  const openInterestAdvisor = (context: ElectiveContext | null = null) => {
    setElectiveContext(context);
    setAppMode('advisor');
    setAdvTab('chatbot');
  };

  const saveElectiveRecommendations = (picks: AdvisorPick[]) => {
    if (!electiveContext || !picks.length) return;
    const key = electiveSlotKey(
      electiveContext.termIndex,
      electiveContext.courseIndex,
      electiveContext.requirement
    );

    setElectiveRecommendations(current => ({
      ...current,
      [key]: picks.map(pick => {
        const catalogCourse = courses.find(course => course.code === pick.code);
        return {
          ...pick,
          title: pick.title || catalogCourse?.title || pick.code,
          match: Number(pick.match || 0)
        };
      })
    }));
    setCollapsedElectiveRecommendations(current => ({ ...current, [key]: false }));
  };

  const applyElectivePick = (pick: any, context: ElectiveContext | null = electiveContext) => {
    if (!context || !result || !pick?.code) return;
    const pickedCode = String(pick.code);
    const catalogCourse = courses.find(course => course.code === pickedCode);
    const key = electiveSlotKey(context.termIndex, context.courseIndex, context.requirement);

    setResult(current => {
      if (!current) return current;
      return {
        ...current,
        semesters: current.semesters.map((semester, termIndex) => {
          if (termIndex !== context.termIndex) return semester;

          let unitDelta = 0;
          const nextCourses = semester.courses.map((course, courseIndex) => {
            if (courseIndex !== context.courseIndex) return course;

            const units = Number(catalogCourse?.units || course.units || 3);
            unitDelta = units - Number(course.units || 0);

            return {
              ...course,
              code: pickedCode,
              title: catalogCourse?.title || pick.title || pickedCode,
              units,
              kind: 'course' as const,
              warnings: [
                `AI-selected elective for ${course.requirementTitle || 'this requirement'}.`,
                ...(pick.reason ? [`Reason: ${pick.reason}`] : [])
              ]
            };
          });

          return {
            ...semester,
            totalUnits: semester.totalUnits + unitDelta,
            courses: nextCourses
          };
        })
      };
    });

    setCollapsedElectiveRecommendations(current => ({ ...current, [key]: true }));
    showToast('Elective applied', `${pickedCode} is now reflected in the plan.`, 'success');
    setAppMode('student');
  };

  const satCount = result?.requirements.filter(r => r.status === 'Satisfied').length || 0;
  const totReqs  = result?.requirements.length || 0;
  const isComplete = Boolean(result?.completionMessage);

  if (!authenticated) {
    return (
      <div className="auth-shell">
        <div className="auth-panel">
          <section className="auth-brand">
            <div className="auth-mark-row">
              <div className="ua-mark auth-ua">UA</div>
              <div>
                <div className="auth-product">MajorLyte</div>
                <div className="auth-product-sub">Degree planning workspace</div>
              </div>
            </div>
            <div className="auth-statement">
              Academic planning, course policy, and advisement data in one focused workspace.
            </div>
            <div className="auth-metrics">
              <div><span>Policy</span><strong>Unit minimums</strong></div>
              <div><span>Load</span><strong>CS balance</strong></div>
              <div><span>Source</span><strong>Advisement report</strong></div>
            </div>
          </section>

          <section className="auth-card">
            <div className="auth-card-header">
              <div>
                <div className="auth-title">{authMode === 'signup' ? 'Create your account' : 'Sign in'}</div>
                <div className="auth-subtitle">Use your student details to start a planning session.</div>
              </div>
              <div className="auth-tabs">
                <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Log in</button>
                <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>Sign up</button>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <div className="field">
                  <label>Full Name</label>
                  <input type="text" value={authForm.name} onChange={e => updateAuth('name', e.target.value)} placeholder="Jane Student" required />
                </div>
              )}
              <div className="field">
                <label>Email</label>
                <input type="email" value={authForm.email} onChange={e => updateAuth('email', e.target.value)} placeholder="student@arizona.edu" required />
              </div>
              <div className="field">
                <label>Password</label>
                <input type="password" value={authForm.password} onChange={e => updateAuth('password', e.target.value)} placeholder="Enter password" required />
              </div>
              {authMode === 'signup' && (
                <div className="field field-row">
                  <div>
                    <label>Student ID</label>
                    <input type="text" value={authForm.studentId} onChange={e => updateAuth('studentId', e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <label>Student Type</label>
                    <select value={authForm.studentType} onChange={e => updateAuth('studentType', e.target.value)}>
                      <option value="domestic">Domestic</option>
                      <option value="international">International</option>
                    </select>
                  </div>
                </div>
              )}
              <button className="btn-primary auth-submit" type="submit">
                {authMode === 'signup' ? 'Create Account' : 'Log In'}
              </button>
            </form>
          </section>
        </div>
        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <>
      <div className="app">

        {/* ─── HEADER ─── */}
        <header className="header">
          <div className="header-left">
            <div className="ua-mark">UA</div>
            <div>
              <div className="header-title">MajorLyte</div>
              <div className="header-sub">Degree planning workspace</div>
            </div>
            <div className="header-badges">
              <span className="badge badge-live">Live data</span>
              <span className="badge badge-gem">Gemini advisor</span>
              {appMode === 'advisor' && <span className="badge badge-adv">Advisor tools</span>}
            </div>
          </div>
          <div className="header-right">
            <div className="mode-tabs">
              <button className={`mode-tab ${appMode === 'student' ? 'active' : ''}`} onClick={() => setAppMode('student')}><GradIcon /> Student</button>
              <button className={`mode-tab ${appMode === 'advisor' ? 'active' : ''}`} onClick={() => setAppMode('advisor')}><BookIcon /> Advisor</button>
            </div>
            <button className="btn-ghost-white" onClick={reset}><ResetIcon /> Reset</button>
            <button className="btn-ghost-white" onClick={() => setAuthenticated(false)}>Sign Out</button>
          </div>
        </header>

        <div className="main">

          {/* ═══ ADVISOR MODE ═══ */}
          {appMode === 'advisor' && (
            <div>
              <div className="adv-subtabs">
                <button className={`adv-subtab ${advTab === 'tools' ? 'active' : ''}`} onClick={() => setAdvTab('tools')}><BookIcon /> Course Management</button>
                <button className={`adv-subtab ${advTab === 'chatbot' ? 'active' : ''}`} onClick={() => setAdvTab('chatbot')}><SparkIcon /> Interest Advisor</button>
              </div>
              {advTab === 'tools' && (
                <AdvisorMode
                  courses={courses}
                  courseTotal={courseTotal}
                  loadingMoreCourses={loadingMoreCourses}
                  onLoadMoreCourses={loadMoreCourses}
                  onSearchCourses={(q) => loadCoursesPage({ reset: true, q })}
                  setCourses={setCourses}
                  showToast={showToast}
                />
              )}
              {advTab === 'chatbot' && (
                <div>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: 'var(--ua-blue)', marginBottom: 5 }}>Interest-Based Course Advisor</div>
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, maxWidth: 680 }}>Gemini analyses each student's interests and matches them against course descriptions and syllabi from the live database to suggest the best-fit electives.</p>
                  </div>
                  <InterestChatbot
                    courseCount={courses.length}
                    electiveContext={electiveContext || undefined}
                    onApplyPick={electiveContext ? applyElectivePick : undefined}
                    onPicks={electiveContext ? saveElectiveRecommendations : undefined}
                  />
                </div>
              )}
            </div>
          )}

          {/* ═══ STUDENT MODE ═══ */}
          {appMode === 'student' && (
            <div className="layout">

              {/* LEFT COLUMN */}
              <div className="left-col">

                {/* Profile card */}
                <div className="card">
                  <div className="card-header"><GradIcon /><span className="card-title">Student Sign-up & Profile</span></div>
                  <div className="card-body">
                    <div className="field">
                      <label>Student Name</label>
                      <input type="text" value={profile.studentName} onChange={e => sp('studentName', e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="field field-row">
                      <div>
                        <label>Email</label>
                        <input type="email" value={profile.studentEmail} onChange={e => sp('studentEmail', e.target.value)} placeholder="student@email.edu" />
                      </div>
                      <div>
                        <label>Student ID</label>
                        <input type="text" value={profile.studentId} onChange={e => sp('studentId', e.target.value)} placeholder="Optional" />
                      </div>
                    </div>
                    <div className="field field-row">
                      <div>
                        <label>Student Type</label>
                        <select value={profile.studentType} onChange={e => sp('studentType', e.target.value)}>
                          <option value="domestic">Domestic</option>
                          <option value="international">International</option>
                        </select>
                      </div>
                      <div>
                        <label>Minimum Load</label>
                        <div className="policy-pill">{profile.studentType === 'international' ? '12 units' : '9 units'}</div>
                      </div>
                    </div>
                    <div className="toggle-row">
                      <div>
                        <div className="toggle-label">Final-term underload approval</div>
                        <div className="toggle-sub">Use only when graduating with advisor approval</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={profile.finalTermApproval} onChange={e => sp('finalTermApproval', e.target.checked)} />
                        <div className="toggle-track" /><div className="toggle-thumb" />
                      </label>
                    </div>
                    <div className="form-sec-title" style={{ marginTop: 14 }}>Academic Plan</div>
                    <div className="field field-row">
                      <div>
                        <label>Standing</label>
                        <select value={profile.standing} onChange={e => sp('standing', e.target.value)}>
                          {['Freshman', 'Sophomore', 'Junior', 'Senior'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Primary Major</label>
                        <select value={profile.major} onChange={e => sp('major', e.target.value)}>
                          {availMajors.map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>Second Major / Minor</label>
                      <select value={profile.secondMajor} onChange={e => sp('secondMajor', e.target.value)}>
                        <option value="">— None —</option>
                        {SECONDARY_PROGRAMS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Expected Graduation</label>
                      <select value={profile.gradTerm} onChange={e => sp('gradTerm', e.target.value)}>
                        {gradTerms.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <label style={{ margin: 0 }}>Max Units / Semester</label>
                        <span className="slider-value">{profile.maxUnits} units</span>
                      </div>
                      <div className="slider-wrap">
                        <input ref={sliderRef} type="range" min={12} max={19} step={1} value={profile.maxUnits} onChange={e => sp('maxUnits', parseInt(e.target.value))} />
                        <div className="slider-labels"><span>12</span><span>19</span></div>
                      </div>
                    </div>
                    <div className="toggle-row">
                      <div>
                        <div className="toggle-label">Summer Sessions</div>
                        <div className="toggle-sub">Include summer in plan</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={profile.summer} onChange={e => sp('summer', e.target.checked)} />
                        <div className="toggle-track" /><div className="toggle-thumb" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Advisement report card */}
                <div className="card">
                  <div className="card-header"><FileIcon /><span className="card-title">Advisement Report</span></div>
                  <div className="card-body">
                    <div className="tabs-list">
                      <button
                        className={`tab-btn ${txTab === 'paste' ? 'active' : ''}`}
                        onClick={() => setTxTab('paste')}
                      >
                        Paste Report
                      </button>
                      <button
                        className={`tab-btn ${txTab === 'upload' ? 'active' : ''}`}
                        onClick={() => setTxTab('upload')}
                      >
                        Upload PDF
                      </button>
                    </div>

                    {txTab === 'paste' ? (
                      <>
                        <textarea
                          value={transcript}
                          onChange={e => {
                            setTx(e.target.value);
                            setReportSnapshot(null);
                          }}
                          placeholder="Paste your advisement report text here..."
                        />
                        {reportSnapshot ? (
                          <div className="report-status report-status-ready">
                            Snapshot {reportSnapshot.snapshotId} imported from this advisement report.
                          </div>
                        ) : transcript.trim() ? (
                          <div className="report-status">
                            This pasted report will be parsed into a new snapshot when you generate the plan.
                          </div>
                        ) : (
                          <div className="report-status">
                            Paste the advisement report text or upload the PDF. Plans are not generated from sample data.
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                          Upload the advisement report PDF. The app will extract, parse, and import it as a planning snapshot.
                        </p>

                        <button
                          className="btn-secondary"
                          style={{ width: 'auto', margin: '0 auto' }}
                          onClick={() => !uploadingTranscript && transcriptFileRef.current?.click()}
                          disabled={uploadingTranscript}
                        >
                          {uploadingTranscript ? 'Importing...' : 'Choose PDF'}
                        </button>

                        <input
                          ref={transcriptFileRef}
                          type="file"
                          accept=".pdf,application/pdf"
                          style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleTranscriptPdf(file);
                          }}
                        />

                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                          After import, Generate Plan will use the snapshot created from that report.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate button */}
                <button className="btn-primary" onClick={generate} disabled={loading || uploadingTranscript}>
                  {loading ? (
                    <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Generating…</>
                  ) : (
                    <><SparkIcon /> Generate Plan</>
                  )}
                </button>

                {availMajors.length === 0 && (
                  <p style={{ fontSize: 11, color: '#b45309', textAlign: 'center', marginTop: -4 }}>
                    ⚠ No courses in database. Switch to Advisor mode → Upload PDF or Add Course Manually.
                  </p>
                )}
                <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: -4 }}>
                  Uses the current uploaded or pasted advisement report. Gemini is not called for plan generation.
                </p>

                {/* Context hint */}
                <div className="context-hint">
                  {profile.major ? (
                    <><strong style={{ color: 'var(--ua-blue)' }}>{profile.major}</strong>
                    {profile.secondMajor && <> + <strong style={{ color: 'var(--ua-copper)' }}>{profile.secondMajor}</strong></>}<br /></>
                  ) : (
                    <span style={{ color: '#b45309' }}>Using imported advisement snapshot<br /></span>
                  )}
                  <span className="link" onClick={() => openInterestAdvisor()}>✦ Interest Advisor</span>
                  {' · '}
                  <a href="https://catalog.arizona.edu" target="_blank" rel="noopener noreferrer">UA Catalog ↗</a>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="right-col">
                {loading ? (
                  <div className="panel-empty">
                    <div className="spinner-wrap">
                      <div className="spinner">
                        <div className="spinner-ring spinner-ring-outer" />
                        <div className="spinner-ring spinner-ring-inner" />
                      </div>
                      <div className="spinner-msg">{LOAD_MSGS[loadIdx]}</div>
                      <div className="spinner-sub">Using imported advisement data</div>
                    </div>
                  </div>

                ) : result ? (
                  <div className="results">

                    {/* Summary */}
                    <div>
                      <div className="summary-grid">
                        <div className="summary-card" style={{ borderTop: '3px solid var(--ua-blue)' }}>
                          <div className="summary-card-label"><span style={{ color: result.feasibility === 'High' ? '#10b981' : result.feasibility === 'Medium' ? '#f59e0b' : '#ef4444' }}>●</span> Feasibility</div>
                          <span className={`pill pill-${result.feasibility.toLowerCase()}`}><span className="pill-dot" />{result.feasibility}</span>
                        </div>
                        <div className="summary-card" style={{ borderTop: '3px solid var(--ua-copper)' }}>
                          <div className="summary-card-label"><ClockIcon /> Graduation</div>
                          <div className="summary-card-value" style={{ fontSize: 15 }}>{result.estimatedGraduationTerm}</div>
                        </div>
                        <div className="summary-card" style={{ borderTop: '3px solid var(--ua-sage)' }}>
                          <div className="summary-card-label"><BookIcon /> Remaining</div>
                          <div className="summary-card-value">{result.remainingUnits} <span style={{ fontSize: 12, fontFamily: "'DM Sans',sans-serif", fontWeight: 400, color: '#9ca3af' }}>units</span></div>
                        </div>
                      </div>
                      <div className="plan-profile-strip">
                        {result.profile?.studentName && <div><span>Student</span><strong>{result.profile.studentName}</strong></div>}
                        <div className="plan-program-cell"><span>Program</span><strong>{result.profile?.primaryMajor || profile.major}</strong></div>
                        <div><span>Type</span><strong>{result.profile?.studentType === 'international' ? 'International' : 'Domestic'}</strong></div>
                        <div><span>Standing</span><strong>{result.profile?.standing || profile.standing}</strong></div>
                        <div><span>Load</span><strong>{result.profile?.maxUnits || profile.maxUnits} units max</strong></div>
                        <div><span>Minimum</span><strong>{result.profile?.minimumUnits || (profile.studentType === 'international' ? 12 : 9)} units</strong></div>
                        <div><span>Summer</span><strong>{(result.profile?.includeSummer ?? profile.summer) ? 'Included' : 'Skipped'}</strong></div>
                        <div><span>Final Approval</span><strong>{(result.profile?.finalTermApproval ?? profile.finalTermApproval) ? 'Yes' : 'No'}</strong></div>
                        {result.profile?.secondMajor && <div><span>Add-on</span><strong>{result.profile.secondMajor}</strong></div>}
                      </div>
                      {result.riskFlags?.length > 0 && (
                        <div className="risk-box">
                          <div className="risk-title"><WarnIcon /> Risk Flags</div>
                          {result.riskFlags.map((f, i) => <div key={i} className="risk-item"><div className="risk-dot" />{f}</div>)}
                        </div>
                      )}
                    </div>

                    <div className="divider" />

                    {/* Export */}
                    <div className="export-row">
                      <button className="btn-secondary" onClick={() => { exportCSV(result); showToast('CSV exported!', '', 'success'); }}><DlIcon /> Export CSV</button>
                      <button className="btn-secondary btn-copper" onClick={() => showToast('PDF export coming soon', '', 'info')}><FileIcon /> Export PDF</button>
                      <button className="btn-secondary btn-sage" onClick={() => openInterestAdvisor()}><HeartIcon /> Interest Advisor</button>
                    </div>

                    <div className="divider" />

                    {isComplete ? (
                      <div className="completion-card">
                        <div className="completion-kicker">Degree Audit Complete</div>
                        <div className="completion-title">{result.completionMessage}</div>
                        <div className="completion-copy">
                          The advisement report shows every tracked requirement as satisfied.
                        </div>
                      </div>
                    ) : (
                      <>
                    {/* Semester Plan */}
                    <div>
                      <div className="section-header">
                        Semester Plan
                        <span>{result.semesters?.length || 0} term{result.semesters?.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="sem-grid">
                        {result.semesters?.map((sem, i) => {
                          const season = sem.term.includes('Summer') ? 'summer' : sem.term.includes('Spring') ? 'spring' : 'fall';
                          const maxUnits = result.profile?.maxUnits || profile.maxUnits;
                          const loadPct = Math.min(100, Math.round((sem.totalUnits / maxUnits) * 100));
                          const diffClass = (sem.difficultyLabel || 'Light').toLowerCase().replace(/\s+/g, '-');
                          return (
                            <div key={i} className={`sem-card sem-${season}`}>
                              <div className="sem-header">
                                <div className="sem-header-left">
                                  <span className="sem-index">Term {i + 1}</span>
                                  <span className={`sem-season-badge badge-${season}`}>{season}</span>
                                  <div>
                                    <div className="sem-term">{sem.term}</div>
                                    <div className="sem-sub">{sem.courses.length} course{sem.courses.length === 1 ? '' : 's'}</div>
                                  </div>
                                </div>
                                <div className="sem-load">
                                  <span className={`difficulty-pill diff-${diffClass}`}>
                                    Difficulty {sem.difficultyScore ?? 0} · {sem.difficultyLabel || 'Light'}
                                  </span>
                                  <span className="cs-count">{sem.computerScienceCourses || 0} CS-heavy</span>
                                  <span className="sem-units">{sem.totalUnits}/{maxUnits} units</span>
                                  <div className="sem-loadbar"><span style={{ width: `${loadPct}%` }} /></div>
                                </div>
                              </div>
                              <div className="sem-courses">
                                {sem.warnings?.map((w, k) => <div key={k} className="sem-warning">⚠ {w}</div>)}
                                {sem.courses.map((c, j) => {
                                  const slotKey = electiveSlotKey(i, j, c.requirement);
                                  const slotRecommendations = electiveRecommendations[slotKey] || [];
                                  const recommendationsCollapsed = Boolean(collapsedElectiveRecommendations[slotKey]);
                                  const canApplyRecommendation = Boolean(c.options?.length);
                                  return (
                                  <div key={j} className={`course-row ${c.kind === 'elective_choice' ? 'course-row-elective' : ''}`}>
                                    <div className="course-left">
                                      <div className="course-line">
                                        <span className="course-code">{c.code}</span>
                                        <span className="course-title-sm">{c.kind === 'elective_choice' ? 'Choose from approved options' : c.title}</span>
                                      </div>
                                      {(c.requirementTitle || c.requirement) && (
                                        <div className="course-req">
                                          {c.requirementTitle || c.requirement}
                                          {c.requirement && <span>{c.requirement}</span>}
                                        </div>
                                      )}
                                      {c.kind === 'elective_choice' && (
                                        <div className="elective-choice-box">
                                          <div className="elective-choice-top">
                                            <span className="elective-choice-label">Personalized elective pick</span>
                                            <button
                                              className="btn-elective-advisor"
                                              onClick={() => openInterestAdvisor({
                                                termIndex: i,
                                                courseIndex: j,
                                                requirement: c.requirement,
                                                requirementTitle: c.requirementTitle,
                                                options: c.options || []
                                              })}
                                            >
                                              <HeartIcon /> Ask Interest Advisor
                                            </button>
                                          </div>
                                          {c.options && c.options.length > 0 && (
                                            <div className="elective-options">
                                              {c.options.slice(0, 8).map(opt => <span key={opt}>{opt}</span>)}
                                              {c.options.length > 8 && <span>+{c.options.length - 8} more</span>}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      {slotRecommendations.length > 0 && recommendationsCollapsed && (
                                        <div className="plan-ai-change-row">
                                          <span>AI choice applied</span>
                                          <button
                                            className="btn-change-choice"
                                            onClick={() => setCollapsedElectiveRecommendations(current => ({ ...current, [slotKey]: false }))}
                                          >
                                            Change choice
                                          </button>
                                        </div>
                                      )}
                                      {slotRecommendations.length > 0 && !recommendationsCollapsed && (
                                        <div className="plan-ai-recs">
                                          <div className="plan-ai-recs-title">AI recommendations from interest chat</div>
                                          <div className="plan-ai-rec-list">
                                            {slotRecommendations.map((pick, recIndex) => (
                                              <div key={`${pick.code}-${recIndex}`} className={`plan-ai-rec ${pick.code === c.code ? 'selected' : ''}`}>
                                                <div className="plan-ai-rec-main">
                                                  <span className="plan-ai-rec-code">{pick.code}</span>
                                                  <span className="plan-ai-rec-title">{pick.title || pick.code}</span>
                                                </div>
                                                <span className={`match-badge ${(pick.match || 0) >= 80 ? 'match-high' : (pick.match || 0) >= 60 ? 'match-med' : 'match-low'}`}>
                                                  {pick.match || 0}%
                                                </span>
                                                <div className="plan-ai-rec-reason">{pick.reason}</div>
                                                {canApplyRecommendation && pick.code !== c.code && (
                                                  <button
                                                    className="btn-sm"
                                                    onClick={() => applyElectivePick(pick, {
                                                      termIndex: i,
                                                      courseIndex: j,
                                                      requirement: c.requirement,
                                                      requirementTitle: c.requirementTitle,
                                                      options: c.options || []
                                                    })}
                                                  >
                                                    Apply
                                                  </button>
                                                )}
                                                {pick.code === c.code && <span className="plan-ai-selected">Selected</span>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {c.warnings?.map((w, k) => <div key={k} className="course-warn">⚠ {w}</div>)}
                                    </div>
                                    <span className="course-units">{c.units} units</span>
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="divider" />

                    {/* Next Term Recommendations */}
                    {result.recommendations?.length > 0 && (
                      <div>
                        <div className="section-header">Next Term Recommendations</div>
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>Course</th><th style={{ textAlign: 'center' }}>Sections</th><th>Modality</th><th style={{ textAlign: 'right' }}></th></tr></thead>
                            <tbody>
                              {result.recommendations.map((r, i) => {
                                const mc = r.modality?.includes('Online') ? 'modality-online' : r.modality?.includes('Hybrid') ? 'modality-hybrid' : 'modality-ip';
                                const isElective = r.kind === 'elective_choice';
                                return (
                                  <tr key={i}>
                                    <td>
                                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: 'var(--ua-blue)' }}>{r.code}</div>
                                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{r.title}</div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}><span style={{ background: '#f1f5f9', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{isElective ? '—' : r.sections}</span></td>
                                    <td><span className={mc} style={{ fontSize: 11 }}>{r.modality}</span></td>
                                    <td style={{ textAlign: 'right' }}>
                                      {isElective ? (
                                        <button className="btn-faculty" onClick={() => openInterestAdvisor()}>Ask Advisor</button>
                                      ) : (
                                        <button className="btn-faculty" onClick={() => setModalCourse(r)}>👤 Faculty</button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                      </>
                    )}

                    <div className="divider" />

                    {/* Requirements */}
                    <div>
                      <div className="section-header">
                        Requirements Checklist
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af' }}>{satCount} / {totReqs}</span>
                      </div>
                      <div className="req-progress-wrap">
                        <div className="req-progress-bar">
                          <div className="req-progress-fill" style={{ width: `${totReqs > 0 ? (satCount / totReqs) * 100 : 0}%` }} />
                        </div>
                        <div className="req-progress-label"><span>{satCount} satisfied</span><span>{totReqs - satCount} remaining</span></div>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Requirement</th><th style={{ textAlign: 'center' }}>Status</th><th style={{ textAlign: 'right' }}>Catalog</th></tr></thead>
                          <tbody>
                            {result.requirements?.map((req, i) => (
                              <tr key={i}>
                                <td style={{ fontSize: 12 }}>{req.name}</td>
                                <td style={{ textAlign: 'center' }}>{req.status === 'Satisfied' ? <span className="status-ok">✓ Done</span> : <span className="status-pending">○ Pending</span>}</td>
                                <td style={{ textAlign: 'right' }}><a href={req.url} target="_blank" rel="noopener noreferrer" className="req-link">Link ↗</a></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', paddingBottom: 8 }}>
                      For advising reference only. Confirm with your{' '}
                      <a href="https://advising.arizona.edu" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ua-sky)' }}>UA academic advisor</a>.
                    </p>

                  </div>

                ) : error ? (
                  <div className="panel-empty">
                    <div className="empty-inner">
                      <div className="empty-icon empty-icon-error" style={{ background: '#fee2e2' }}><WarnIcon /></div>
                      <div className="empty-title" style={{ color: 'var(--ua-red)' }}>Something went wrong</div>
                      <div className="err-box">{error}</div>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16 }}>Plan generation uses the imported advisement snapshot. Check the local snapshot data if this keeps failing.</p>
                    </div>
                  </div>

                ) : (
                  <div className="panel-empty">
                    <div className="empty-inner">
                      <div className="empty-icon"><GradIcon /><div className="empty-icon-badge">AI</div></div>
                      <div className="empty-title">Planning Workspace</div>
                      <p className="empty-desc">
                        {availMajors.length === 0
                          ? 'Start in Advisor mode — upload a course catalog PDF or add courses manually. Then return here to generate a plan.'
                          : 'Review the student profile and generate an advisement-based roadmap.'}
                      </p>
                      <p className="empty-arrow">{availMajors.length === 0 ? 'Switch to Advisor mode above' : 'Profile settings are on the left'}</p>
                      <div style={{ marginTop: 16 }}>
                        <button onClick={() => openInterestAdvisor()} style={{ background: 'rgba(12,35,75,.07)', border: '1px solid rgba(12,35,75,.12)', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--ua-blue)', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <SparkIcon /> Interest Advisor
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Faculty Modal */}
        {modalCourse && (
          <div className="modal-overlay" onClick={() => setModalCourse(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{modalCourse.code} Instructors</div>
                  <div className="modal-subtitle">{modalCourse.title}</div>
                </div>
                <button className="modal-close" onClick={() => setModalCourse(null)}>✕</button>
              </div>
              <div className="modal-body">
                {modalCourse.instructors?.map((inst: string, i: number) => {
                  const last = inst.split(' ').pop();
                  return (
                    <div key={i} className="instructor-row">
                      <div className="instructor-avatar">{last?.[0] || '?'}</div>
                      <div>
                        <div className="instructor-name">{inst}</div>
                        <div className="instructor-rmp">
                          <a href={`https://www.ratemyprofessors.com/search/professors/1003?q=${encodeURIComponent(last || '')}`} target="_blank" rel="noopener noreferrer">
                            View on RateMyProfessors →
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-footer">
                Register at <a href="https://uaccess.arizona.edu" target="_blank" rel="noopener noreferrer">UAccess ↗</a>
              </div>
            </div>
          </div>
        )}

        {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      </div>
    </>
  );
}
