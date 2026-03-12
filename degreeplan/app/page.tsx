'use client';
import { useState, useEffect, useRef } from 'react';

interface Course {
  id?: number; code: string; title: string; units: number;
  category: string; major: string; description: string;
  syllabus: string; prereqs: string[]; offered: string[];
}
interface PlanResult {
  feasibility: string; estimatedGraduationTerm: string; remainingUnits: number;
  completedCourses: string[]; riskFlags: string[];
  semesters: { term: string; totalUnits: number; courses: { code: string; title: string; units: number; warnings: string[] }[] }[];
  requirements: { name: string; status: string; url: string }[];
  recommendations: { code: string; title: string; sections: number; modality: string; instructors: string[] }[];
}
interface ToastMsg { title: string; desc?: string; type: 'success' | 'error' | 'info' }
interface ChatMsg { role: 'user' | 'assistant'; content: string }

function exportCSV(r: PlanResult) {
  const rows = [
    ['UA DegreePlan Export'], ['Feasibility', r.feasibility],
    ['Graduation', r.estimatedGraduationTerm], ['Remaining Units', r.remainingUnits], [],
    ['SEMESTER PLAN'], ['Term', 'Code', 'Title', 'Units', 'Warnings'],
    ...r.semesters.flatMap(s => s.courses.map(c => [s.term, c.code, c.title, c.units, c.warnings.join('; ')])),
    [], ['REQUIREMENTS'], ['Requirement', 'Status'],
    ...r.requirements.map(x => [x.name, x.status]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'degreeplan.csv'; a.click();
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--ua-blue:#0C234B;--ua-red:#AB0520;--ua-copper:#B3781B;--ua-sage:#3D6B4F;--ua-sky:#1A6FA0;--ua-warm:#F5F0E8;--ua-desert:#E8D9BC;--radius:12px;--shadow-sm:0 1px 3px rgba(12,35,75,.08),0 1px 2px rgba(12,35,75,.04);--shadow-md:0 4px 16px rgba(12,35,75,.10),0 2px 4px rgba(12,35,75,.06)}
.app{font-family:'DM Sans',system-ui,sans-serif;background:var(--ua-warm);background-image:radial-gradient(ellipse 80% 50% at 15% 0%,rgba(171,5,32,.06) 0%,transparent 60%),radial-gradient(ellipse 60% 60% at 90% 90%,rgba(12,35,75,.07) 0%,transparent 60%);min-height:100vh;color:#1a1a2e;-webkit-font-smoothing:antialiased}
.header{background:rgba(12,35,75,.97);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.08);padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.header-left{display:flex;align-items:center;gap:12px}
.ua-mark{width:34px;height:34px;border-radius:8px;background:var(--ua-red);display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-weight:700;font-size:13px;color:white;flex-shrink:0}
.header-title{font-family:'Playfair Display',serif;font-weight:700;font-size:16px;color:white}
.header-sub{font-size:10px;color:rgba(255,255,255,.45);margin-top:1px}
.header-badges{display:flex;gap:6px;margin-left:8px}
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.03em}
.badge-gem{background:rgba(100,140,240,.2);color:#a0c0ff;border:1px solid rgba(100,140,240,.25)}
.badge-adv{background:rgba(171,5,32,.2);color:#ffaaaa;border:1px solid rgba(171,5,32,.35)}
.badge-live{background:rgba(61,107,79,.3);color:#7ed9a0;border:1px solid rgba(61,107,79,.4)}
.header-right{display:flex;align-items:center;gap:8px}
.btn-ghost-white{background:transparent;border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);padding:4px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:6px;transition:all .15s}
.btn-ghost-white:hover{background:rgba(255,255,255,.08);color:white}
.mode-tabs{display:flex;background:rgba(255,255,255,.08);border-radius:8px;padding:2px;gap:2px}
.mode-tab{padding:4px 14px;border:none;background:transparent;border-radius:6px;font-size:11px;font-weight:700;color:rgba(255,255,255,.45);cursor:pointer;font-family:inherit;transition:all .15s;display:flex;align-items:center;gap:5px}
.mode-tab.active{background:rgba(255,255,255,.16);color:white}
.mode-tab:hover:not(.active){color:rgba(255,255,255,.75)}
.main{max-width:1280px;margin:0 auto;padding:24px 20px}
.layout{display:flex;gap:20px}
.left-col{width:340px;flex-shrink:0;display:flex;flex-direction:column;gap:14px}
.right-col{flex:1;min-width:0}
@media(max-width:900px){.layout,.adv-layout{flex-direction:column}.left-col,.adv-sidebar{width:100%!important}}
.card{background:white;border:1px solid rgba(12,35,75,.1);border-radius:var(--radius);box-shadow:var(--shadow-sm);overflow:hidden}
.card-header{padding:14px 16px 10px;border-bottom:1px solid rgba(12,35,75,.06);display:flex;align-items:center;gap:8px}
.card-title{font-family:'Playfair Display',serif;font-size:13px;font-weight:700;color:var(--ua-blue);letter-spacing:-.01em}
.card-body{padding:14px 16px}
.field{margin-bottom:12px}.field:last-child{margin-bottom:0}
.field-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
label{display:block;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#6b7280;margin-bottom:5px}
select,textarea,input[type=text],input[type=number]{width:100%;padding:7px 10px;border:1px solid #dde3ee;border-radius:7px;font-size:13px;font-family:inherit;color:#1e293b;background:white;transition:border-color .15s,box-shadow .15s;outline:none}
select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;padding-right:28px}
select:focus,textarea:focus,input[type=text]:focus,input[type=number]:focus{border-color:var(--ua-blue);box-shadow:0 0 0 3px rgba(12,35,75,.08)}
textarea{resize:none;height:160px;font-size:11px;font-family:'JetBrains Mono',monospace;line-height:1.6;color:#334155}
textarea.short{height:72px;font-family:inherit;font-size:12px}
input[type=text],input[type=number]{height:34px}
.slider-wrap{position:relative;padding:4px 0}
.slider-labels{display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:4px}
.slider-value{font-size:13px;font-weight:700;color:var(--ua-blue)}
input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:2px;background:#dde3ee;outline:none;cursor:pointer;background-image:linear-gradient(var(--ua-blue),var(--ua-blue));background-size:calc((var(--v,16) - 12)/7*100%) 100%;background-repeat:no-repeat}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--ua-blue);border:2px solid white;box-shadow:0 1px 4px rgba(12,35,75,.3);cursor:pointer}
.toggle-row{display:flex;align-items:center;justify-content:space-between;background:var(--ua-warm);border-radius:8px;padding:10px 12px}
.toggle-label{font-size:12px;font-weight:500;color:#374151}.toggle-sub{font-size:10px;color:#9ca3af;margin-top:1px}
.toggle{position:relative;width:36px;height:20px;cursor:pointer}
.toggle input{opacity:0;width:0;height:0}
.toggle-track{position:absolute;inset:0;border-radius:10px;background:#d1d5db;transition:background .2s}
.toggle input:checked+.toggle-track{background:var(--ua-blue)}
.toggle-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:white;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}
.toggle input:checked~.toggle-thumb{transform:translateX(16px)}
.tabs-list{display:flex;background:#f1f5f9;border-radius:8px;padding:3px;gap:2px;margin-bottom:10px}
.tab-btn{flex:1;padding:5px 10px;border:none;background:transparent;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;color:#6b7280;transition:all .15s}
.tab-btn.active{background:white;color:var(--ua-blue);box-shadow:var(--shadow-sm);font-weight:600}
.btn-primary{width:100%;height:44px;background:var(--ua-blue);color:white;border:none;border-radius:10px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 16px rgba(12,35,75,.25);transition:all .15s}
.btn-primary:hover:not(:disabled){background:#0a1d40;transform:translateY(-1px)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.btn-secondary{flex:1;height:36px;background:white;border:1px solid rgba(12,35,75,.15);color:var(--ua-blue);border-radius:8px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s}
.btn-secondary:hover{background:rgba(12,35,75,.04)}
.btn-copper{color:var(--ua-copper);border-color:rgba(179,120,27,.2)}.btn-copper:hover{background:rgba(179,120,27,.05)}
.btn-sage{color:var(--ua-sage);border-color:rgba(61,107,79,.2)}.btn-sage:hover{background:rgba(61,107,79,.05)}
.btn-sample{width:100%;padding:7px;background:transparent;border:1px dashed rgba(12,35,75,.2);border-radius:7px;font-size:11px;font-weight:600;color:var(--ua-blue);cursor:pointer;font-family:inherit;transition:all .15s;margin-top:6px;display:flex;align-items:center;justify-content:center;gap:6px}
.btn-sample:hover{background:rgba(12,35,75,.04);border-style:solid}
.btn-sm{padding:4px 10px;background:transparent;border:1px solid rgba(12,35,75,.15);border-radius:6px;font-size:11px;font-weight:600;color:var(--ua-blue);cursor:pointer;font-family:inherit;transition:all .15s;display:inline-flex;align-items:center;gap:4px}
.btn-sm:hover{background:rgba(12,35,75,.05)}.btn-sm.danger{color:#dc2626;border-color:#fecaca}.btn-sm.danger:hover{background:#fef2f2}
.context-hint{background:rgba(232,217,188,.4);border:1px solid rgba(179,120,27,.2);border-radius:10px;padding:10px 14px;text-align:center;font-size:12px;color:#6b5020;line-height:1.5}
.context-hint a,.context-hint span.link{color:var(--ua-sky);text-decoration:none;cursor:pointer}
.context-hint a:hover,.context-hint span.link:hover{text-decoration:underline}
.panel-empty{background:white;border:1px solid rgba(12,35,75,.08);border-radius:16px;min-height:520px;display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-sm)}
.empty-inner{text-align:center;padding:40px 20px}
.empty-icon{width:72px;height:72px;border-radius:18px;background:rgba(12,35,75,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;position:relative}
.empty-icon-badge{position:absolute;bottom:-4px;right:-4px;width:24px;height:24px;border-radius:50%;background:var(--ua-red);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;border:2px solid white}
.empty-title{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--ua-blue);margin-bottom:10px}
.empty-desc{font-size:13px;color:#6b7280;line-height:1.6;max-width:280px;margin:0 auto}
.empty-arrow{font-size:12px;color:#9ca3af;margin-top:14px}
.spinner-wrap{text-align:center;padding:60px 20px}
.spinner{position:relative;width:52px;height:52px;margin:0 auto 20px}
.spinner-ring{position:absolute;inset:0;border-radius:50%;border:3px solid transparent;animation:spin 1.1s linear infinite}
.spinner-ring-outer{border-top-color:var(--ua-blue);border-right-color:var(--ua-red)}
.spinner-ring-inner{inset:7px;border-bottom-color:var(--ua-copper);animation-direction:reverse;animation-duration:.7s}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner-msg{font-size:13px;font-weight:600;color:#374151;min-height:20px}.spinner-sub{font-size:11px;color:#9ca3af;margin-top:4px}
.results{display:flex;flex-direction:column;gap:24px;animation:fadeUp .4s ease-out}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.summary-card{background:white;border:1px solid rgba(12,35,75,.1);border-radius:12px;padding:14px;box-shadow:var(--shadow-sm)}
.summary-card-label{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#9ca3af;margin-bottom:6px;display:flex;align-items:center;gap:5px}
.summary-card-value{font-family:'Playfair Display',serif;font-size:18px;font-weight:700;line-height:1;color:var(--ua-blue)}
.pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
.pill-dot{width:7px;height:7px;border-radius:50%}
.pill-high{background:#d1fae5;color:#065f46}.pill-high .pill-dot{background:#10b981}
.pill-medium{background:#fef3c7;color:#92400e}.pill-medium .pill-dot{background:#f59e0b}
.pill-low{background:#fee2e2;color:#991b1b}.pill-low .pill-dot{background:#ef4444}
.risk-box{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px}
.risk-title{font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#92400e;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.risk-item{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#78350f;margin-bottom:5px;line-height:1.4}
.risk-item:last-child{margin-bottom:0}.risk-dot{width:5px;height:5px;border-radius:50%;background:#f59e0b;flex-shrink:0;margin-top:5px}
.section-header{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
.divider{height:1px;background:rgba(12,35,75,.08)}
.sem-grid{display:flex;flex-direction:column;gap:10px}
.sem-card{background:white;border-radius:12px;border:1px solid rgba(12,35,75,.08);border-left:4px solid;overflow:hidden;box-shadow:var(--shadow-sm)}
.sem-fall{border-left-color:var(--ua-blue)}.sem-spring{border-left-color:var(--ua-sage)}.sem-summer{border-left-color:var(--ua-copper)}
.sem-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid rgba(12,35,75,.06);background:rgba(12,35,75,.02)}
.sem-header-left{display:flex;align-items:center;gap:8px}
.sem-season-badge{padding:2px 8px;border-radius:5px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
.badge-fall{background:var(--ua-blue);color:white}.badge-spring{background:var(--ua-sage);color:white}.badge-summer{background:var(--ua-copper);color:white}
.sem-term{font-size:13px;font-weight:600;color:#1e293b}.sem-units{font-size:11px;font-weight:700;color:#6b7280}
.sem-courses{padding:10px 14px;display:flex;flex-direction:column;gap:8px}
.course-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.course-left{flex:1;min-width:0}
.course-code{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--ua-blue)}
.course-title-sm{font-size:11px;color:#6b7280;margin-top:1px}
.course-warn{font-size:10px;color:#b45309;margin-top:2px;display:flex;align-items:center;gap:4px}
.course-units{font-family:'JetBrains Mono',monospace;font-size:11px;color:#9ca3af;flex-shrink:0}
.req-progress-wrap{margin-bottom:10px}
.req-progress-bar{height:5px;border-radius:3px;background:#e5e7eb;overflow:hidden}
.req-progress-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--ua-sage),#4ade80);transition:width .5s ease}
.req-progress-label{display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:4px}
.table-wrap{background:white;border-radius:10px;border:1px solid rgba(12,35,75,.08);overflow:hidden;box-shadow:var(--shadow-sm)}
table{width:100%;border-collapse:collapse}
th{background:#f8fafc;padding:8px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9ca3af;border-bottom:1px solid #e5e7eb}
td{padding:8px 12px;font-size:12px;border-bottom:1px solid #f1f5f9;color:#374151}
tr:last-child td{border-bottom:none}tr:hover td{background:#fafbfe}
.status-ok{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#065f46}
.status-pending{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#92400e}
.req-link{color:var(--ua-sky);font-size:11px;text-decoration:none}.req-link:hover{text-decoration:underline}
.modality-ip{color:var(--ua-sage)}.modality-hybrid{color:#b45309}.modality-online{color:#7c3aed}
.btn-faculty{padding:3px 10px;background:rgba(12,35,75,.06);border:none;border-radius:6px;font-size:11px;font-weight:600;color:var(--ua-blue);cursor:pointer;font-family:inherit;transition:background .15s}
.btn-faculty:hover{background:rgba(12,35,75,.12)}
.modal-overlay{position:fixed;inset:0;background:rgba(10,20,50,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s ease;padding:16px}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:white;border-radius:16px;width:420px;max-width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(10,20,50,.25);animation:scaleIn .2s ease;overflow:hidden}
.modal-lg{width:600px}
@keyframes scaleIn{from{transform:scale(.95);opacity:0}to{transform:scale(1);opacity:1}}
.modal-header{background:var(--ua-blue);padding:16px 20px;display:flex;align-items:flex-start;justify-content:space-between;flex-shrink:0}
.modal-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:white}
.modal-subtitle{font-size:11px;color:rgba(255,255,255,.55);margin-top:2px}
.modal-close{background:rgba(255,255,255,.12);border:none;width:26px;height:26px;border-radius:6px;color:white;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.modal-close:hover{background:rgba(255,255,255,.2)}
.modal-body{padding:16px 20px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1}
.modal-footer{padding:10px 20px 16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f1f5f9;flex-shrink:0}
.modal-footer a{color:var(--ua-sky);text-decoration:none}.modal-footer a:hover{text-decoration:underline}
.instructor-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--ua-warm)}
.instructor-avatar{width:32px;height:32px;border-radius:50%;background:var(--ua-blue);color:white;font-family:'Playfair Display',serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.instructor-name{font-size:13px;font-weight:500;color:#1e293b}
.instructor-rmp{font-size:11px;color:var(--ua-sky)}.instructor-rmp a{color:inherit;text-decoration:none}.instructor-rmp a:hover{text-decoration:underline}
.toast{position:fixed;bottom:20px;right:20px;z-index:300;background:white;border:1px solid rgba(12,35,75,.12);border-radius:10px;padding:12px 16px;box-shadow:var(--shadow-md);max-width:320px;animation:slideUp .3s ease;display:flex;gap:10px;align-items:flex-start}
@keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.toast-icon{width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;margin-top:1px}
.toast-success{background:#d1fae5;color:#065f46}.toast-error{background:#fee2e2;color:#991b1b}.toast-info{background:rgba(12,35,75,.1);color:var(--ua-blue)}
.toast-title{font-size:13px;font-weight:700;color:#1e293b}.toast-desc{font-size:12px;color:#6b7280;margin-top:2px}
.export-row{display:flex;gap:8px}
.adv-layout{display:flex;gap:20px}
.adv-sidebar{width:240px;flex-shrink:0;display:flex;flex-direction:column;gap:12px}
.adv-main{flex:1;min-width:0}
.adv-nav-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:500;color:#374151;transition:all .15s;border:1px solid transparent}
.adv-nav-item:hover{background:rgba(12,35,75,.05)}.adv-nav-item.active{background:rgba(12,35,75,.08);color:var(--ua-blue);font-weight:600;border-color:rgba(12,35,75,.12)}
.adv-nav-icon{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.adv-panel{background:white;border-radius:16px;border:1px solid rgba(12,35,75,.1);box-shadow:var(--shadow-sm)}
.adv-panel-hdr{padding:18px 22px;border-bottom:1px solid rgba(12,35,75,.08);display:flex;align-items:center;justify-content:space-between}
.adv-panel-title{font-family:'Playfair Display',serif;font-size:17px;font-weight:700;color:var(--ua-blue)}
.adv-panel-desc{font-size:12px;color:#6b7280;margin-top:3px}
.adv-panel-body{padding:18px 22px}
.adv-subtabs{display:flex;gap:0;border-bottom:2px solid #f1f5f9;margin-bottom:20px}
.adv-subtab{padding:9px 18px;border:none;background:transparent;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;color:#6b7280;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all .15s;display:flex;align-items:center;gap:6px}
.adv-subtab.active{color:var(--ua-blue);border-bottom-color:var(--ua-blue)}
.adv-subtab:hover:not(.active){color:#374151}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.stat-card{background:var(--ua-warm);border-radius:9px;padding:11px 13px;border:1px solid rgba(12,35,75,.07)}
.stat-num{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;color:var(--ua-blue)}.stat-label{font-size:11px;color:#6b7280;margin-top:2px}
.db-filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center}
.db-search{flex:1;min-width:140px;height:34px;padding:0 10px 0 32px;border:1px solid #dde3ee;border-radius:7px;font-size:12px;font-family:inherit;outline:none;background:white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='M21 21l-4.35-4.35'/%3E%3C/svg%3E") no-repeat 9px center}
.db-search:focus{border-color:var(--ua-blue);box-shadow:0 0 0 3px rgba(12,35,75,.08)}
.db-filter-sel{height:34px;padding:0 24px 0 9px;border:1px solid #dde3ee;border-radius:7px;font-size:12px;font-family:inherit;outline:none;color:#374151;background:white url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 6px center;appearance:none;cursor:pointer}
.db-filter-sel:focus{border-color:var(--ua-blue)}
.db-count{font-size:11px;color:#9ca3af;white-space:nowrap}
.course-tag{display:inline-flex;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace}
.tag-core{background:rgba(12,35,75,.1);color:var(--ua-blue)}.tag-elective{background:rgba(61,107,79,.1);color:var(--ua-sage)}.tag-capstone{background:rgba(171,5,32,.1);color:var(--ua-red)}.tag-lab{background:rgba(179,120,27,.1);color:var(--ua-copper)}.tag-other{background:#f1f5f9;color:#64748b}
.prereq-chip{display:inline-flex;padding:1px 5px;background:#fef3c7;color:#92400e;border-radius:4px;font-size:10px;font-family:'JetBrains Mono',monospace;font-weight:600;margin-right:3px}
.offered-chip{display:inline-flex;padding:1px 5px;background:#f0fdf4;color:#166534;border-radius:3px;font-size:10px;font-weight:600;margin-right:2px}
.upload-zone{border:2px dashed rgba(12,35,75,.2);border-radius:12px;padding:36px 24px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(12,35,75,.02)}
.upload-zone:hover,.upload-zone.drag-over{border-color:var(--ua-blue);background:rgba(12,35,75,.05)}
.upload-zone-icon{font-size:40px;margin-bottom:12px}.upload-zone-title{font-weight:600;font-size:15px;color:#1e293b;margin-bottom:5px}.upload-zone-sub{font-size:12px;color:#6b7280;line-height:1.5}
.upload-zone-fmts{display:flex;gap:6px;justify-content:center;margin-top:12px}
.fmt-pill{padding:2px 8px;background:rgba(12,35,75,.08);border-radius:4px;font-size:10px;font-weight:700;color:var(--ua-blue);font-family:'JetBrains Mono',monospace}
.processing-bar{height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:8px}
.processing-fill{height:100%;background:linear-gradient(90deg,var(--ua-blue),var(--ua-sky));border-radius:2px;animation:pslide 1.5s ease-in-out infinite}
@keyframes pslide{0%{width:0%;margin-left:0%}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}
.form-sec-title{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;margin-bottom:9px;padding-bottom:6px;border-bottom:1px solid #f1f5f9}
.tag-input-wrap{display:flex;flex-wrap:wrap;gap:5px;padding:6px 8px;border:1px solid #dde3ee;border-radius:7px;cursor:text;min-height:36px;align-items:center}
.tag-input-wrap:focus-within{border-color:var(--ua-blue);box-shadow:0 0 0 3px rgba(12,35,75,.08)}
.tag-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;background:rgba(12,35,75,.08);border-radius:4px;font-size:11px;color:var(--ua-blue);font-weight:600}
.tag-chip-x{cursor:pointer;font-size:13px;line-height:1;color:#6b7280;border:none;background:none;padding:0}.tag-chip-x:hover{color:var(--ua-red)}
.tag-bare-input{border:none;outline:none;font-size:12px;font-family:inherit;min-width:80px;flex:1;background:transparent}
.chk-group{display:flex;gap:12px;flex-wrap:wrap}
.chk-item{display:flex;align-items:center;gap:5px;font-size:12px;color:#374151;cursor:pointer}
.chk-item input[type=checkbox]{width:14px;height:14px;accent-color:var(--ua-blue);cursor:pointer}
.chat-wrap{display:flex;gap:18px;flex-wrap:wrap}
.chatbox{flex:1 1 360px;display:flex;flex-direction:column;background:white;border-radius:16px;border:1px solid rgba(12,35,75,.1);box-shadow:var(--shadow-sm);overflow:hidden;height:580px}
.chat-hdr{background:linear-gradient(135deg,#0C234B 0%,#1a3a6b 100%);padding:14px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0}
.chat-hdr-avatar{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.chat-hdr-name{font-weight:700;font-size:14px;color:white}.chat-hdr-status{font-size:11px;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:4px;margin-top:1px}
.chat-hdr-dot{width:6px;height:6px;border-radius:50%;background:#4ade80}
.chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.msg-row{display:flex;gap:7px;max-width:88%}
.msg-row.user{align-self:flex-end;flex-direction:row-reverse}.msg-row.assistant{align-self:flex-start}
.msg-avatar{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:3px}
.msg-avatar.ai{background:var(--ua-blue);color:white;font-weight:700;font-family:'Playfair Display',serif}.msg-avatar.hu{background:var(--ua-desert);color:var(--ua-blue);font-size:13px}
.msg-bubble{padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.5}
.msg-bubble.user{background:var(--ua-blue);color:white;border-bottom-right-radius:3px}
.msg-bubble.assistant{background:#f1f5f9;color:#1e293b;border-bottom-left-radius:3px}
.msg-bubble.typing{background:#f1f5f9}
.chat-input-row{padding:10px 14px;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:flex-end;flex-shrink:0;background:white}
.chat-textarea{flex:1;min-height:36px;max-height:100px;padding:8px 12px;border:1px solid #dde3ee;border-radius:18px;font-size:13px;font-family:inherit;outline:none;resize:none;line-height:1.4;transition:border-color .15s}
.chat-textarea:focus{border-color:var(--ua-blue)}
.chat-send{width:36px;height:36px;border-radius:50%;background:var(--ua-blue);border:none;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0}
.chat-send:hover:not(:disabled){background:#0a1d40;transform:scale(1.06)}.chat-send:disabled{opacity:.4;cursor:not-allowed}
.typing-dots span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#9ca3af;margin:0 2px;animation:tbounce 1.2s infinite ease-in-out}
.typing-dots span:nth-child(2){animation-delay:.2s}.typing-dots span:nth-child(3){animation-delay:.4s}
@keyframes tbounce{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
.picks-panel{flex:0 1 260px;min-width:200px}
.pick-card{background:white;border:1px solid rgba(12,35,75,.1);border-radius:10px;padding:10px 12px;margin-bottom:8px;transition:all .15s}
.pick-card:hover{border-color:var(--ua-blue);box-shadow:0 0 0 3px rgba(12,35,75,.06)}
.match-badge{font-size:10px;font-weight:800;padding:2px 7px;border-radius:20px;flex-shrink:0}
.match-high{background:#d1fae5;color:#065f46}.match-med{background:#fef3c7;color:#92400e}.match-low{background:#f1f5f9;color:#64748b}
.err-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;font-size:13px;color:#991b1b;line-height:1.5;text-align:left;margin-top:12px}
::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#f1f5f9;border-radius:10px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
`;

const SAMPLE_TX = `UNIVERSITY OF ARIZONA — UNOFFICIAL TRANSCRIPT
Student: Jane Doe  |  ID: 123456789
Major: Computer Science (BS)  |  Standing: Junior  |  GPA: 3.72

━━━ COMPLETED COURSEWORK ━━━━━━━━━━━━━━━━━━━━━━
Fall 2023
  CSC 110   Intro to Computer Programming        3  A
  MATH 122B Calculus I                           4  A−
  ENGL 101  First Year Composition               3  B+

Spring 2024
  CSC 120   Intro to Computer Programming II     3  A
  MATH 129  Calculus II                          4  B+

Fall 2024
  CSC 210   Software Development                 3  A
  MATH 223  Vector Calculus III                  4  A

Spring 2025
  CSC 252   Computer Organization                3  B+
  CSC 335   OO Programming & Design              3  A
  MATH 254  Intro to Ordinary Diff Eqs           3  A

TOTAL COMPLETED UNITS: 34`;

const LOAD_MSGS = ['Parsing transcript…','Mapping requirements…','Checking prereq chains…','Analyzing course load…','Optimizing schedule…','Flagging risks…','Building your plan…'];

// ── Icons ────────────────────────────────────────────────────────────────────
const Ic = ({d,s=14}:{d:string;s?:number}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);
const SparkIcon = ({s}:{s?:number}) => <Ic s={s} d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>;
const GradIcon  = () => <Ic d="M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>;
const FileIcon  = () => <Ic d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6"/>;
const WarnIcon  = () => <Ic d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01"/>;
const DlIcon    = () => <Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3"/>;
const ResetIcon = () => <Ic d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16 M8 16H3v5"/>;
const BookIcon  = () => <Ic d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>;
const ClockIcon = () => <Ic d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 6v6l4 2"/>;
const PlusIcon  = () => <Ic d="M12 5v14M5 12h14"/>;
const SendIcon  = () => <Ic d="M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z"/>;
const HeartIcon = () => <Ic d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>;

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({msg, onDone}:{msg:ToastMsg; onDone:()=>void}) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, []);
  return (
    <div className="toast">
      <div className={`toast-icon toast-${msg.type}`}>{msg.type==='success'?'✓':msg.type==='error'?'✕':'i'}</div>
      <div>
        <div className="toast-title">{msg.title}</div>
        {msg.desc && <div className="toast-desc">{msg.desc}</div>}
      </div>
    </div>
  );
}

// ── TagInput ─────────────────────────────────────────────────────────────────
function TagInput({values, onChange, placeholder}:{values:string[]; onChange:(v:string[])=>void; placeholder:string}) {
  const [raw, setRaw] = useState('');
  const commit = () => {
    const v = raw.trim().replace(/,$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setRaw('');
  };
  return (
    <div className="tag-input-wrap" onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
      {values.map((v, i) => (
        <span key={i} className="tag-chip">{v}
          <button className="tag-chip-x" onClick={() => onChange(values.filter((_, j) => j !== i))}>×</button>
        </span>
      ))}
      <input className="tag-bare-input" value={raw} placeholder={values.length ? '' : placeholder}
        onChange={e => setRaw(e.target.value)}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ',') && raw.trim()) { e.preventDefault(); commit(); }
          if (e.key === 'Backspace' && !raw && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={() => { if (raw.trim()) commit(); }}
      />
    </div>
  );
}

// ── CourseForm ───────────────────────────────────────────────────────────────
function CourseForm({initial, onSave, onCancel}:{initial:Course|null; onSave:(c:Course)=>void; onCancel:()=>void}) {
  const blank: Course = {code:'',title:'',units:3,category:'',major:'',description:'',syllabus:'',prereqs:[],offered:[]};
  const [f, setF] = useState<Course>(initial || blank);
  const set = (k: keyof Course, v: any) => setF(p => ({...p, [k]: v}));
  const valid = f.code.trim() && f.title.trim() && f.major.trim() && f.category.trim();
  return (
    <div>
      <div style={{marginBottom:16}}>
        <div className="form-sec-title">Basic Info</div>
        <div className="field-row" style={{marginBottom:10}}>
          <div><label>Course Code *</label><input type="text" value={f.code} onChange={e=>set('code',e.target.value)} placeholder="e.g. MATH 355"/></div>
          <div><label>Units *</label><input type="number" value={f.units} min={1} max={6} onChange={e=>set('units',parseInt(e.target.value)||3)}/></div>
        </div>
        <div style={{marginBottom:10}}><label>Course Title *</label><input type="text" value={f.title} onChange={e=>set('title',e.target.value)} placeholder="e.g. Linear Algebra"/></div>
        <div className="field-row">
          <div><label>Category *</label><input type="text" value={f.category} onChange={e=>set('category',e.target.value)} placeholder="Core, Elective…"/></div>
          <div><label>Degree / Major *</label><input type="text" value={f.major} onChange={e=>set('major',e.target.value)} placeholder="Mathematics (BA)"/></div>
        </div>
      </div>
      <div style={{marginBottom:16}}>
        <div className="form-sec-title">Description & Syllabus</div>
        <div style={{marginBottom:10}}><label>Description (used by AI chatbot)</label><textarea className="short" value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Brief summary of topics covered…"/></div>
        <div><label>Syllabus URL (optional)</label><input type="text" value={f.syllabus} onChange={e=>set('syllabus',e.target.value)} placeholder="https://…"/></div>
      </div>
      <div style={{marginBottom:16}}>
        <div className="form-sec-title">Prerequisites</div>
        <label>Prereq Courses (press Enter after each code)</label>
        <TagInput values={f.prereqs} onChange={v=>set('prereqs',v)} placeholder="e.g. MATH 129"/>
      </div>
      <div style={{marginBottom:20}}>
        <div className="form-sec-title">Scheduling</div>
        <label>Offered Semesters</label>
        <div className="chk-group">
          {['Fall','Spring','Summer'].map(s => (
            <label key={s} className="chk-item">
              <input type="checkbox" checked={f.offered.includes(s)} onChange={e=>set('offered',e.target.checked?[...f.offered,s]:f.offered.filter(o=>o!==s))}/>{s}
            </label>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn-primary" style={{flex:1,height:40,fontSize:13}} disabled={!valid} onClick={()=>onSave(f)}>
          <PlusIcon/> {initial ? 'Save Changes' : 'Add Course'}
        </button>
        <button className="btn-secondary" style={{flex:'0 0 90px'}} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── AdvisorMode ──────────────────────────────────────────────────────────────
function AdvisorMode({courses, setCourses, showToast}:{courses:Course[]; setCourses:React.Dispatch<React.SetStateAction<Course[]>>; showToast:(t:string,d:string,y:string)=>void}) {
  const [section, setSection] = useState('db');
  const [search, setSearch]   = useState('');
  const [fMajor, setFMajor]   = useState('All');
  const [fCat, setFCat]       = useState('All');
  const [editC, setEditC]     = useState<Course|null>(null);
  const [modal, setModal]     = useState(false);
  const [pdfState, setPdfState] = useState<'idle'|'processing'|'done'|'error'>('idle');
  const [pdfMsg, setPdfMsg]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const majors  = ['All', ...new Set(courses.map(c => c.major))];
  const cats    = ['All', ...new Set(courses.map(c => c.category))];
  const q       = search.toLowerCase();
  const filtered = courses.filter(c =>
    (!q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) &&
    (fMajor === 'All' || c.major === fMajor) &&
    (fCat   === 'All' || c.category === fCat)
  );

  const tagCls = (cat:string) =>
    cat.includes('Core') ? 'tag-core' : cat.includes('Capstone') ? 'tag-capstone' :
    cat.includes('Elective') ? 'tag-elective' : cat.includes('Lab') ? 'tag-lab' : 'tag-other';

  const refreshCourses = async () => {
    const r = await fetch('/api/courses');
    const d = await r.json();
    setCourses(d.courses || []);
  };

  const handleSave = async (c: Course) => {
    try {
      const method = editC ? 'PUT' : 'POST';
      const url    = editC ? `/api/courses?id=${editC.id}` : '/api/courses';
      const res    = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(c)});
      const data   = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      await refreshCourses();
      showToast(editC ? 'Course updated!' : 'Course added!', `${c.code} saved to the database.`, 'success');
      setModal(false);
    } catch (e:any) { showToast('Error', e.message, 'error'); }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/courses?id=${id}`, {method:'DELETE'});
      if (!res.ok) throw new Error('Delete failed');
      setCourses(cs => cs.filter(c => c.id !== id));
      showToast('Course removed', '', 'info');
    } catch (e:any) { showToast('Error', e.message, 'error'); }
  };

  const handleFile = async (file: File) => {
    setPdfState('processing'); setPdfMsg('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res  = await fetch('/api/catalog', {method:'POST', body:fd});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Parse failed');
      await refreshCourses();
      setPdfState('done');
      showToast('Catalog parsed!', `${data.inserted} new courses added (${data.total} found in document).`, 'success');
    } catch (e:any) { setPdfState('error'); setPdfMsg(e.message); showToast('Parse error', e.message, 'error'); }
  };

  const nav = [
    {id:'db',    icon:'📚', label:'Course Database'},
    {id:'upload',icon:'📄', label:'Upload PDF Catalog'},
    {id:'add',   icon:'➕', label:'Add Course Manually'},
    {id:'majors',icon:'🎓', label:'Manage Majors'},
  ];

  return (
    <div className="adv-layout">
      {/* Sidebar */}
      <div className="adv-sidebar">
        <div className="card">
          <div className="card-header"><span style={{fontSize:16}}>🛡️</span><span className="card-title">Advisor Tools</span></div>
          <div className="card-body" style={{padding:'8px'}}>
            {nav.map(n => (
              <div key={n.id} className={`adv-nav-item ${section===n.id?'active':''}`} onClick={() => setSection(n.id)}>
                <div className="adv-nav-icon" style={{background:section===n.id?'rgba(12,35,75,.1)':'#f8fafc'}}>{n.icon}</div>
                <span>{n.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card"><div className="card-body">
          <div className="stat-grid">
            <div className="stat-card"><div className="stat-num">{courses.length}</div><div className="stat-label">Courses</div></div>
            <div className="stat-card"><div className="stat-num">{new Set(courses.map(c=>c.major)).size}</div><div className="stat-label">Majors</div></div>
            <div className="stat-card"><div className="stat-num">{new Set(courses.map(c=>c.category)).size}</div><div className="stat-label">Categories</div></div>
            <div className="stat-card"><div className="stat-num">{courses.filter(c=>c.prereqs.length===0).length}</div><div className="stat-label">No prereqs</div></div>
          </div>
        </div></div>
      </div>

      {/* Main panel */}
      <div className="adv-main">

        {/* DATABASE */}
        {section === 'db' && (
          <div className="adv-panel">
            <div className="adv-panel-hdr">
              <div><div className="adv-panel-title">Course Database</div><div className="adv-panel-desc">All courses used for degree planning. Edit or remove any entry.</div></div>
              <button className="btn-primary" style={{width:'auto',height:34,padding:'0 14px',fontSize:12}} onClick={() => {setEditC(null); setModal(true);}}>
                <PlusIcon/> Add Course
              </button>
            </div>
            <div className="adv-panel-body">
              <div className="db-filters">
                <input className="db-search" placeholder="Search courses…" value={search} onChange={e=>setSearch(e.target.value)}/>
                <select className="db-filter-sel" value={fMajor} onChange={e=>setFMajor(e.target.value)}>{majors.map(m=><option key={m}>{m}</option>)}</select>
                <select className="db-filter-sel" value={fCat}   onChange={e=>setFCat(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select>
                <span className="db-count">{filtered.length} course{filtered.length!==1?'s':''}</span>
              </div>
              <div className="table-wrap" style={{maxHeight:460,overflowY:'auto'}}>
                <table>
                  <thead><tr>
                    <th>Code</th><th>Title</th><th>Major</th><th>Category</th>
                    <th style={{textAlign:'center'}}>Cr</th><th>Prereqs</th><th>Offered</th>
                    <th style={{textAlign:'right'}}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} style={{textAlign:'center',color:'#9ca3af',padding:24}}>
                        No courses yet. Upload a catalog PDF or add courses manually.
                      </td></tr>
                    )}
                    {filtered.map(c => (
                      <tr key={c.id}>
                        <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:11,color:'var(--ua-blue)'}}>{c.code}</span></td>
                        <td>
                          <div style={{fontWeight:500,fontSize:12}}>{c.title}</div>
                          {c.description && <div style={{fontSize:10,color:'#9ca3af',marginTop:1,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.description}</div>}
                        </td>
                        <td style={{fontSize:11,color:'#6b7280',maxWidth:110,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.major}</td>
                        <td><span className={`course-tag ${tagCls(c.category)}`}>{c.category}</span></td>
                        <td style={{textAlign:'center'}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:12}}>{c.units}</span></td>
                        <td>{c.prereqs.length===0 ? <span style={{color:'#9ca3af',fontSize:11}}>—</span> : c.prereqs.map(p=><span key={p} className="prereq-chip">{p}</span>)}</td>
                        <td>{c.offered.map(o=><span key={o} className="offered-chip">{o}</span>)}</td>
                        <td style={{textAlign:'right'}}>
                          <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                            <button className="btn-sm" onClick={() => {setEditC(c); setModal(true);}}>✏️</button>
                            <button className="btn-sm danger" onClick={() => handleDelete(c.id!)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* UPLOAD */}
        {section === 'upload' && (
          <div className="adv-panel">
            <div className="adv-panel-hdr">
              <div><div className="adv-panel-title">Upload Course Catalog</div><div className="adv-panel-desc">Upload your university's PDF catalog — Gemini extracts every course automatically.</div></div>
            </div>
            <div className="adv-panel-body">
              <div className="upload-zone"
                onClick={() => pdfState === 'idle' && fileRef.current?.click()}
                onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add('drag-over')}}
                onDragLeave={e=>e.currentTarget.classList.remove('drag-over')}
                onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f&&pdfState==='idle')handleFile(f);}}>
                <div className="upload-zone-icon">{pdfState==='processing'?'⚙️':pdfState==='done'?'✅':pdfState==='error'?'❌':'📄'}</div>
                <div className="upload-zone-title">
                  {pdfState==='processing'?'Gemini is parsing your document…':pdfState==='done'?'Catalog parsed successfully!':pdfState==='error'?'Parse error — try again':'Drop catalog PDF here, or click to browse'}
                </div>
                <div className="upload-zone-sub">
                  {pdfState==='processing'?'Extracting course codes, titles, prerequisites, descriptions…':
                   pdfState==='done'?'New courses have been added to the database. Check the Course Database tab.':
                   pdfState==='error'?pdfMsg:'Gemini will extract course codes, titles, descriptions, prerequisites, and scheduling info'}
                </div>
                {pdfState==='idle'&&<div className="upload-zone-fmts"><span className="fmt-pill">.pdf</span><span className="fmt-pill">.txt</span></div>}
                {pdfState==='processing'&&<div className="processing-bar"><div className="processing-fill"/></div>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.txt" style={{display:'none'}} onChange={e=>{if(e.target.files?.[0])handleFile(e.target.files[0]);}}/>
              {(pdfState==='done'||pdfState==='error') && (
                <button className="btn-sample" style={{marginTop:12}} onClick={()=>setPdfState('idle')}>Upload another file</button>
              )}
              <div style={{marginTop:22}}>
                <div className="form-sec-title" style={{marginBottom:12}}>What Gemini extracts from your catalog</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {['Course code & number','Full course title','Credit / unit count','Course description','Prerequisites list','Offered semesters','Degree requirement type','Syllabus URL (if present)'].map(x=>(
                    <div key={x} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'#374151'}}><span style={{color:'var(--ua-sage)',fontWeight:700}}>✓</span>{x}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADD MANUALLY */}
        {section === 'add' && (
          <div className="adv-panel">
            <div className="adv-panel-hdr">
              <div><div className="adv-panel-title">Add Course Manually</div><div className="adv-panel-desc">Course descriptions power the AI interest advisor chatbot.</div></div>
            </div>
            <div className="adv-panel-body">
              <CourseForm initial={null} onSave={c => { handleSave(c); }} onCancel={() => {}}/>
            </div>
          </div>
        )}

        {/* MAJORS */}
        {section === 'majors' && (
          <div className="adv-panel">
            <div className="adv-panel-hdr">
              <div><div className="adv-panel-title">Degree Programs</div><div className="adv-panel-desc">All programs in the system, auto-grouped from course entries.</div></div>
            </div>
            <div className="adv-panel-body">
              {[...new Set(courses.map(c=>c.major))].length === 0 && (
                <div style={{color:'#9ca3af',fontSize:13,textAlign:'center',padding:'32px 0'}}>No courses in the database. Upload a catalog or add courses manually to see majors.</div>
              )}
              {[...new Set(courses.map(c=>c.major))].map(major => {
                const mc = courses.filter(c => c.major === major);
                return (
                  <div key={major} className="card" style={{marginBottom:12}}>
                    <div className="card-header" style={{justifyContent:'space-between'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:18}}>🎓</span><span className="card-title" style={{fontSize:14}}>{major}</span></div>
                      <span style={{fontSize:11,color:'#6b7280',background:'#f1f5f9',padding:'2px 8px',borderRadius:5,fontWeight:700}}>{mc.length} courses</span>
                    </div>
                    <div className="card-body" style={{paddingTop:8}}>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
                        {[...new Set(mc.map(c=>c.category))].map(cat=><span key={cat} className={`course-tag ${tagCls(cat)}`}>{cat} ({mc.filter(c=>c.category===cat).length})</span>)}
                      </div>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                        {mc.map(c=><span key={c.id} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,color:'var(--ua-blue)',background:'rgba(12,35,75,.07)',padding:'2px 6px',borderRadius:4}}>{c.code}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{editC ? `Edit ${editC.code}` : 'Add New Course'}</div>
                <div className="modal-subtitle">{editC ? 'Update course details' : 'Descriptions power the AI advisor'}</div>
              </div>
              <button className="modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <CourseForm initial={editC} onSave={handleSave} onCancel={()=>setModal(false)}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── InterestChatbot ──────────────────────────────────────────────────────────
function InterestChatbot({courseCount}:{courseCount:number}) {
  const INIT: ChatMsg[] = [{role:'assistant', content:"Hi! I'm your AI course advisor ✦\n\nI'll learn about your interests through conversation, then match you with the best courses from the live catalog.\n\nLet's start: **What topics genuinely excite you?** (e.g. AI, pure math, biology, game dev, finance, social sciences…)"}];
  const [msgs, setMsgs]       = useState<ChatMsg[]>(INIT);
  const [input, setInput]     = useState('');
  const [thinking, setThinking] = useState(false);
  const [picks, setPicks]     = useState<any[]>([]);
  const [history, setHistory] = useState<{role:'user'|'model';parts:string}[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}); }, [msgs, thinking]);

  const parsePicks = (text: string) => {
    const m = text.match(/PICKS:(\[[\s\S]*?\])/);
    if (!m) return [];
    try { return JSON.parse(m[1]).filter((p:any) => p.code && p.reason); }
    catch { return []; }
  };
  const cleanText = (t: string) => t.replace(/PICKS:\[[\s\S]*?\]/, '').trim();

  const send = async () => {
    const msg = input.trim();
    if (!msg || thinking) return;
    setInput('');
    setMsgs(m => [...m, {role:'user', content:msg}]);
    setThinking(true);
    try {
      const res  = await fetch('/api/chat', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({history, message:msg})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API error');
      const reply    = data.reply as string;
      const newPicks = parsePicks(reply);
      if (newPicks.length) setPicks(newPicks);
      setHistory(h => [...h, {role:'user',parts:msg}, {role:'model',parts:cleanText(reply)}]);
      setMsgs(m => [...m, {role:'assistant', content:cleanText(reply)}]);
    } catch (e:any) {
      setMsgs(m => [...m, {role:'assistant', content:`Sorry, I hit an error: ${e.message}. Make sure GEMINI_API_KEY is set in .env.local.`}]);
    }
    setThinking(false);
  };

  const renderText = (txt: string) => txt.split('\n').map((line, i) => {
    const html = line.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\*(.*?)\*/g,'<em>$1</em>');
    return <div key={i} dangerouslySetInnerHTML={{__html: html || '&nbsp;'}}/>;
  });

  return (
    <div className="chat-wrap">
      <div className="chatbox">
        <div className="chat-hdr">
          <div className="chat-hdr-avatar">✦</div>
          <div>
            <div className="chat-hdr-name">Course Advisor AI</div>
            <div className="chat-hdr-status"><div className="chat-hdr-dot"/>Powered by Gemini · {courseCount} courses loaded</div>
          </div>
        </div>
        <div className="chat-msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`msg-row ${m.role}`}>
              <div className={`msg-avatar ${m.role==='assistant'?'ai':'hu'}`}>{m.role==='assistant'?'AI':'👤'}</div>
              <div className={`msg-bubble ${m.role}`}>{renderText(m.content)}</div>
            </div>
          ))}
          {thinking && (
            <div className="msg-row assistant">
              <div className="msg-avatar ai">AI</div>
              <div className="msg-bubble typing"><div className="typing-dots"><span/><span/><span/></div></div>
            </div>
          )}
          <div ref={endRef}/>
        </div>
        <div className="chat-input-row">
          <textarea className="chat-textarea" rows={1} value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder="Tell me about your interests…"/>
          <button className="chat-send" onClick={send} disabled={!input.trim()||thinking}><SendIcon/></button>
        </div>
      </div>

      <div className="picks-panel">
        <div className="card" style={{height:'100%'}}>
          <div className="card-header"><span style={{fontSize:16}}>💡</span><span className="card-title">Personalized Picks</span></div>
          <div className="card-body" style={{overflowY:'auto',maxHeight:500}}>
            {picks.length === 0 ? (
              <div style={{textAlign:'center',padding:'28px 0',color:'#9ca3af'}}>
                <div style={{fontSize:28,marginBottom:8}}>🎯</div>
                <div style={{fontSize:12,lineHeight:1.5}}>Chat with the advisor and it will recommend courses matched to your interests from the live database</div>
              </div>
            ) : (
              <>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'#9ca3af',marginBottom:10}}>Matched to your interests</div>
                {picks.map((p, i) => (
                  <div key={i} className="pick-card">
                    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:6,marginBottom:4}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:'var(--ua-blue)'}}>{p.code}</span>
                      <span className={`match-badge ${p.match>=80?'match-high':p.match>=60?'match-med':'match-low'}`}>{p.match}%</span>
                    </div>
                    <div style={{fontSize:11,color:'#1e293b',lineHeight:1.4,marginBottom:3}}>{p.reason}</div>
                    {p.syllabus && <a href={p.syllabus} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'var(--ua-sky)',textDecoration:'none',display:'block',marginTop:3}}>📎 Syllabus ↗</a>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [appMode, setAppMode] = useState<'student'|'advisor'>('student');
  const [advTab, setAdvTab]   = useState<'tools'|'chatbot'>('tools');
  const [courses, setCourses] = useState<Course[]>([]);
  const [profile, setProfile] = useState({standing:'Junior',major:'',secondMajor:'',gradTerm:'Spring 2027',maxUnits:16,summer:false});
  const [transcript, setTx]   = useState('');
  const [txTab, setTxTab]     = useState('paste');
  const [result, setResult]   = useState<PlanResult|null>(null);
  const [loading, setLoading] = useState(false);
  const [loadIdx, setLoadIdx] = useState(0);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState<ToastMsg|null>(null);
  const [modalCourse, setModalCourse] = useState<any>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  const sp = (k: string, v: any) => setProfile(p => ({...p, [k]: v}));
  const showToast = (title: string, desc: string, type: string) => setToast({title, desc, type: type as any});

  // Load courses from DB on mount
  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(d => {
      const cs: Course[] = d.courses || [];
      setCourses(cs);
      if (cs.length > 0) sp('major', cs[0].major);
    });
  }, []);

  useEffect(() => {
    if (!loading) return;
    const iv = setInterval(() => setLoadIdx(i => (i+1) % LOAD_MSGS.length), 900);
    return () => clearInterval(iv);
  }, [loading]);

  useEffect(() => {
    if (sliderRef.current) sliderRef.current.style.setProperty('--v', String(profile.maxUnits));
  }, [profile.maxUnits]);

  const gradTerms: string[] = [];
  for (let y = 2026; y <= 2031; y++) { gradTerms.push(`Spring ${y}`, `Fall ${y}`); }
  const availMajors = [...new Set(courses.map(c => c.major))];

  const generate = async () => {
    if (!transcript.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res  = await fetch('/api/plan', {method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({transcriptText:transcript, major:profile.major, secondMajor:profile.secondMajor||undefined, standing:profile.standing, gradTerm:profile.gradTerm, maxUnits:profile.maxUnits, includeSummer:profile.summer})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setResult(data);
      showToast('Plan generated!', 'Your AI-powered roadmap is ready.', 'success');
    } catch (e:any) { setError(e.message); showToast('Error', e.message, 'error'); }
    finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setTx(''); setError(''); showToast('Reset', '', 'info'); };

  const satCount = result?.requirements.filter(r => r.status === 'Satisfied').length || 0;
  const totReqs  = result?.requirements.length || 0;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: STYLES}}/>
      <div className="app">

        {/* ─── HEADER ─── */}
        <header className="header">
          <div className="header-left">
            <div className="ua-mark">UA</div>
            <div>
              <div className="header-title">DegreePlan Copilot</div>
              <div className="header-sub">Powered by Google Gemini</div>
            </div>
            <div className="header-badges">
              <span className="badge badge-live">🟢 LIVE</span>
              <span className="badge badge-gem">✦ Gemini</span>
              {appMode === 'advisor' && <span className="badge badge-adv">🛡️ ADVISOR</span>}
            </div>
          </div>
          <div className="header-right">
            <div className="mode-tabs">
              <button className={`mode-tab ${appMode==='student'?'active':''}`} onClick={()=>setAppMode('student')}><GradIcon/> Student</button>
              <button className={`mode-tab ${appMode==='advisor'?'active':''}`} onClick={()=>setAppMode('advisor')}>🛡️ Advisor</button>
            </div>
            <button className="btn-ghost-white" onClick={reset}><ResetIcon/> Reset</button>
          </div>
        </header>

        <div className="main">

          {/* ═══ ADVISOR MODE ═══ */}
          {appMode === 'advisor' && (
            <div>
              <div className="adv-subtabs">
                <button className={`adv-subtab ${advTab==='tools'?'active':''}`} onClick={()=>setAdvTab('tools')}>📚 Course Management</button>
                <button className={`adv-subtab ${advTab==='chatbot'?'active':''}`} onClick={()=>setAdvTab('chatbot')}>✦ Interest Advisor Chatbot</button>
              </div>
              {advTab === 'tools' && <AdvisorMode courses={courses} setCourses={setCourses} showToast={showToast}/>}
              {advTab === 'chatbot' && (
                <div>
                  <div style={{marginBottom:18}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:'var(--ua-blue)',marginBottom:5}}>Interest-Based Course Advisor</div>
                    <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6,maxWidth:680}}>Gemini analyses each student's interests and matches them against course descriptions and syllabi from the live database to suggest the best-fit electives.</p>
                  </div>
                  <InterestChatbot courseCount={courses.length}/>
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
                  <div className="card-header"><GradIcon/><span className="card-title">Student Profile</span></div>
                  <div className="card-body">
                    <div className="field field-row">
                      <div>
                        <label>Standing</label>
                        <select value={profile.standing} onChange={e=>sp('standing',e.target.value)}>
                          {['Freshman','Sophomore','Junior','Senior'].map(s=><option key={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label>Primary Major</label>
                        <select value={profile.major} onChange={e=>sp('major',e.target.value)}>
                          {availMajors.length === 0 && <option value="">— Add courses first —</option>}
                          {availMajors.map(m=><option key={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>Second Major / Minor</label>
                      <select value={profile.secondMajor} onChange={e=>sp('secondMajor',e.target.value)}>
                        <option value="">— None —</option>
                        {availMajors.filter(m=>m!==profile.major).map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Expected Graduation</label>
                      <select value={profile.gradTerm} onChange={e=>sp('gradTerm',e.target.value)}>
                        {gradTerms.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <label style={{margin:0}}>Max Units / Semester</label>
                        <span className="slider-value">{profile.maxUnits} units</span>
                      </div>
                      <div className="slider-wrap">
                        <input ref={sliderRef} type="range" min={12} max={19} step={1} value={profile.maxUnits} onChange={e=>sp('maxUnits',parseInt(e.target.value))}/>
                        <div className="slider-labels"><span>12</span><span>19</span></div>
                      </div>
                    </div>
                    <div className="toggle-row">
                      <div>
                        <div className="toggle-label">Summer Sessions</div>
                        <div className="toggle-sub">Include summer in plan</div>
                      </div>
                      <label className="toggle">
                        <input type="checkbox" checked={profile.summer} onChange={e=>sp('summer',e.target.checked)}/>
                        <div className="toggle-track"/><div className="toggle-thumb"/>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Transcript card */}
                <div className="card">
                  <div className="card-header"><FileIcon/><span className="card-title">Transcript</span></div>
                  <div className="card-body">
                    <div className="tabs-list">
                      <button className={`tab-btn ${txTab==='paste'?'active':''}`} onClick={()=>setTxTab('paste')}>Paste Text</button>
                      <button className={`tab-btn ${txTab==='upload'?'active':''}`} onClick={()=>setTxTab('upload')}>Upload PDF</button>
                    </div>
                    {txTab === 'paste' ? (
                      <>
                        <textarea value={transcript} onChange={e=>setTx(e.target.value)} placeholder="Paste your unofficial transcript text here…"/>
                        <button className="btn-sample" onClick={()=>setTx(SAMPLE_TX)}><SparkIcon/> Load sample transcript</button>
                      </>
                    ) : (
                      <div style={{textAlign:'center',padding:'30px 0'}}>
                        <div style={{fontSize:32,marginBottom:8}}>📄</div>
                        <p style={{fontSize:12,color:'#6b7280'}}>PDF transcript upload coming soon.</p>
                        <p style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Use "Paste Text" tab for now.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Generate button */}
                <button className="btn-primary" onClick={generate} disabled={!transcript.trim()||loading||availMajors.length===0}>
                  {loading ? (
                    <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .8s linear infinite'}}/> Generating…</>
                  ) : (
                    <><SparkIcon/> Generate Plan</>
                  )}
                </button>

                {availMajors.length === 0 && (
                  <p style={{fontSize:11,color:'#b45309',textAlign:'center',marginTop:-4}}>
                    ⚠ No courses in database. Switch to Advisor mode → Upload PDF or Add Course Manually.
                  </p>
                )}
                {!transcript.trim() && availMajors.length > 0 && (
                  <p style={{fontSize:11,color:'#9ca3af',textAlign:'center',marginTop:-4}}>Paste a transcript or load the sample to begin</p>
                )}

                {/* Context hint */}
                <div className="context-hint">
                  {profile.major ? (
                    <><strong style={{color:'var(--ua-blue)'}}>{profile.major}</strong>
                    {profile.secondMajor && <> + <strong style={{color:'var(--ua-copper)'}}>{profile.secondMajor}</strong></>}<br/></>
                  ) : (
                    <span style={{color:'#b45309'}}>Select your major above<br/></span>
                  )}
                  <span className="link" onClick={()=>{setAppMode('advisor');setAdvTab('chatbot');}}>✦ Interest Advisor</span>
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
                        <div className="spinner-ring spinner-ring-outer"/>
                        <div className="spinner-ring spinner-ring-inner"/>
                      </div>
                      <div className="spinner-msg">{LOAD_MSGS[loadIdx]}</div>
                      <div className="spinner-sub">Powered by Gemini 1.5 Pro</div>
                    </div>
                  </div>

                ) : result ? (
                  <div className="results">

                    {/* Summary */}
                    <div>
                      <div className="summary-grid">
                        <div className="summary-card" style={{borderTop:'3px solid var(--ua-blue)'}}>
                          <div className="summary-card-label"><span style={{color:result.feasibility==='High'?'#10b981':result.feasibility==='Medium'?'#f59e0b':'#ef4444'}}>●</span> Feasibility</div>
                          <span className={`pill pill-${result.feasibility.toLowerCase()}`}><span className="pill-dot"/>{result.feasibility}</span>
                        </div>
                        <div className="summary-card" style={{borderTop:'3px solid var(--ua-copper)'}}>
                          <div className="summary-card-label"><ClockIcon/> Graduation</div>
                          <div className="summary-card-value" style={{fontSize:15}}>{result.estimatedGraduationTerm}</div>
                        </div>
                        <div className="summary-card" style={{borderTop:'3px solid var(--ua-sage)'}}>
                          <div className="summary-card-label"><BookIcon/> Remaining</div>
                          <div className="summary-card-value">{result.remainingUnits} <span style={{fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:400,color:'#9ca3af'}}>units</span></div>
                        </div>
                      </div>
                      {result.riskFlags?.length > 0 && (
                        <div className="risk-box">
                          <div className="risk-title"><WarnIcon/> Risk Flags</div>
                          {result.riskFlags.map((f,i)=><div key={i} className="risk-item"><div className="risk-dot"/>{f}</div>)}
                        </div>
                      )}
                    </div>

                    <div className="divider"/>

                    {/* Export */}
                    <div className="export-row">
                      <button className="btn-secondary" onClick={()=>{exportCSV(result);showToast('CSV exported!','','success')}}><DlIcon/> Export CSV</button>
                      <button className="btn-secondary btn-copper" onClick={()=>showToast('PDF export coming soon','','info')}><FileIcon/> Export PDF</button>
                      <button className="btn-secondary btn-sage" onClick={()=>{setAppMode('advisor');setAdvTab('chatbot');}}><HeartIcon/> Interest Advisor</button>
                    </div>

                    <div className="divider"/>

                    {/* Semester Plan */}
                    <div>
                      <div className="section-header">Semester Plan</div>
                      <div className="sem-grid">
                        {result.semesters?.map((sem, i) => {
                          const season = sem.term.includes('Fall') ? 'fall' : sem.term.includes('Spring') ? 'spring' : 'summer';
                          return (
                            <div key={i} className={`sem-card sem-${season}`}>
                              <div className="sem-header">
                                <div className="sem-header-left">
                                  <span className={`sem-season-badge badge-${season}`}>{season}</span>
                                  <span className="sem-term">{sem.term}</span>
                                </div>
                                <span className="sem-units">{sem.totalUnits} units</span>
                              </div>
                              <div className="sem-courses">
                                {sem.courses.map((c, j) => (
                                  <div key={j} className="course-row">
                                    <div className="course-left">
                                      <div style={{display:'flex',gap:8,alignItems:'baseline'}}>
                                        <span className="course-code">{c.code}</span>
                                        <span className="course-title-sm">{c.title}</span>
                                      </div>
                                      {c.warnings?.map((w,k)=><div key={k} className="course-warn">⚠ {w}</div>)}
                                    </div>
                                    <span className="course-units">{c.units}u</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="divider"/>

                    {/* Next Term Recommendations */}
                    {result.recommendations?.length > 0 && (
                      <div>
                        <div className="section-header">Next Term Recommendations</div>
                        <div className="table-wrap">
                          <table>
                            <thead><tr><th>Course</th><th style={{textAlign:'center'}}>Sections</th><th>Modality</th><th style={{textAlign:'right'}}></th></tr></thead>
                            <tbody>
                              {result.recommendations.map((r, i) => {
                                const mc = r.modality?.includes('Online') ? 'modality-online' : r.modality?.includes('Hybrid') ? 'modality-hybrid' : 'modality-ip';
                                return (
                                  <tr key={i}>
                                    <td>
                                      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:'var(--ua-blue)'}}>{r.code}</div>
                                      <div style={{fontSize:11,color:'#6b7280',marginTop:1}}>{r.title}</div>
                                    </td>
                                    <td style={{textAlign:'center'}}><span style={{background:'#f1f5f9',padding:'2px 7px',borderRadius:5,fontSize:11,fontWeight:700}}>{r.sections}</span></td>
                                    <td><span className={mc} style={{fontSize:11}}>{r.modality}</span></td>
                                    <td style={{textAlign:'right'}}><button className="btn-faculty" onClick={()=>setModalCourse(r)}>👤 Faculty</button></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="divider"/>

                    {/* Requirements */}
                    <div>
                      <div className="section-header">
                        Requirements Checklist
                        <span style={{fontSize:10,fontWeight:700,color:'#9ca3af'}}>{satCount} / {totReqs}</span>
                      </div>
                      <div className="req-progress-wrap">
                        <div className="req-progress-bar">
                          <div className="req-progress-fill" style={{width:`${totReqs>0?(satCount/totReqs)*100:0}%`}}/>
                        </div>
                        <div className="req-progress-label"><span>{satCount} satisfied</span><span>{totReqs-satCount} remaining</span></div>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Requirement</th><th style={{textAlign:'center'}}>Status</th><th style={{textAlign:'right'}}>Catalog</th></tr></thead>
                          <tbody>
                            {result.requirements?.map((req, i) => (
                              <tr key={i}>
                                <td style={{fontSize:12}}>{req.name}</td>
                                <td style={{textAlign:'center'}}>{req.status==='Satisfied'?<span className="status-ok">✓ Done</span>:<span className="status-pending">○ Pending</span>}</td>
                                <td style={{textAlign:'right'}}><a href={req.url} target="_blank" rel="noopener noreferrer" className="req-link">Link ↗</a></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <p style={{fontSize:11,color:'#9ca3af',textAlign:'center',paddingBottom:8}}>
                      For advising reference only. Confirm with your{' '}
                      <a href="https://advising.arizona.edu" target="_blank" rel="noopener noreferrer" style={{color:'var(--ua-sky)'}}>UA academic advisor</a>.
                    </p>

                  </div>

                ) : error ? (
                  <div className="panel-empty">
                    <div className="empty-inner">
                      <div className="empty-icon" style={{background:'#fee2e2',fontSize:28}}>⚠️</div>
                      <div className="empty-title" style={{color:'var(--ua-red)'}}>Something went wrong</div>
                      <div className="err-box">{error}</div>
                      <p style={{fontSize:11,color:'#9ca3af',marginTop:16}}>Check that GEMINI_API_KEY is set in .env.local</p>
                    </div>
                  </div>

                ) : (
                  <div className="panel-empty">
                    <div className="empty-inner">
                      <div className="empty-icon">🎓<div className="empty-icon-badge">AI</div></div>
                      <div className="empty-title">Ready to plan?</div>
                      <p className="empty-desc">
                        {availMajors.length === 0
                          ? 'Start in Advisor mode — upload a course catalog PDF or add courses manually. Then return here to generate a plan.'
                          : 'Fill in your profile, paste your transcript, and hit Generate Plan for your AI-powered roadmap.'}
                      </p>
                      <p className="empty-arrow">{availMajors.length===0?'↑ Switch to Advisor mode above':'← Configure your profile on the left'}</p>
                      <div style={{marginTop:16}}>
                        <button onClick={()=>{setAppMode('advisor');setAdvTab('chatbot');}} style={{background:'rgba(12,35,75,.07)',border:'1px solid rgba(12,35,75,.12)',borderRadius:8,padding:'8px 16px',fontSize:12,fontWeight:600,color:'var(--ua-blue)',cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:6}}>
                          ✦ Try the Interest Advisor
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
          <div className="modal-overlay" onClick={()=>setModalCourse(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{modalCourse.code} Instructors</div>
                  <div className="modal-subtitle">{modalCourse.title}</div>
                </div>
                <button className="modal-close" onClick={()=>setModalCourse(null)}>✕</button>
              </div>
              <div className="modal-body">
                {modalCourse.instructors?.map((inst:string, i:number) => {
                  const last = inst.split(' ').pop();
                  return (
                    <div key={i} className="instructor-row">
                      <div className="instructor-avatar">{last?.[0] || '?'}</div>
                      <div>
                        <div className="instructor-name">{inst}</div>
                        <div className="instructor-rmp">
                          <a href={`https://www.ratemyprofessors.com/search/professors/1003?q=${encodeURIComponent(last||'')}`} target="_blank" rel="noopener noreferrer">
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

        {toast && <Toast msg={toast} onDone={()=>setToast(null)}/>}
      </div>
    </>
  );
}
