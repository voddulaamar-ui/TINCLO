import { useState, useEffect } from 'react';
import ApiService from '../services/ApiService';

const STORAGE_KEY = 'tinclo_notifications';

const SAMPLE_NOTIFICATIONS = [
  { id: 1, type: 'match',  title: 'New Job Match!',        message: 'Full Stack Developer at Infosys matches your profile', time: '2 min ago',  read: false, icon: '🎯' },
  { id: 2, type: 'apply',  title: 'Application Submitted', message: 'Your application for Data Scientist at TCS was sent',   time: '1 hr ago',   read: false, icon: '✅' },
  { id: 3, type: 'view',   title: 'Profile Viewed',        message: 'A recruiter from Wipro viewed your profile',            time: '3 hrs ago',  read: true,  icon: '👁️' },
  { id: 4, type: 'match',  title: 'New Job Match!',        message: 'React Native Developer at Swiggy matches your skills',  time: '5 hrs ago',  read: true,  icon: '🎯' },
  { id: 5, type: 'system', title: 'Welcome to TINCLO!',    message: 'Start swiping to find your dream job',                  time: '1 day ago',  read: true,  icon: '💼' },
];

const TYPE_COLORS = { match: '#667eea', apply: '#48bb78', view: '#f6ad55', system: '#764ba2' };

const loadNotifications = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { /* ignore */ }
  return SAMPLE_NOTIFICATIONS;
};

const saveNotifications = (notifications) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications)); } catch (e) { /* ignore */ }
};

const Notifications = ({ onClose }) => {
  const [notifications, setNotifications] = useState(loadNotifications);
  const [filter, setFilter] = useState('');
  const [usingServer, setUsingServer] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const token = localStorage.getItem('tinclo_token');
    if (!token) return;
    ApiService.getNotifications(filter ? { type: filter } : {})
      .then(data => {
        setUsingServer(true);
        setNotifications((data.notifications || []).map(n => ({
          id: n._id || n.id,
          type: n.type || 'system',
          title: n.title,
          message: n.message,
          time: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now',
          read: n.read,
          icon: n.icon || 'bell',
        })));
      })
      .catch(() => setUsingServer(false));
  }, [filter]);

  useEffect(() => { if (!usingServer) saveNotifications(notifications); }, [notifications, usingServer]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (usingServer) ApiService.markAllNotificationsRead().catch(() => {});
  };
  const markRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (usingServer) ApiService.markNotificationRead(id).catch(() => {});
  };
  const deleteNotif = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (usingServer) ApiService.deleteNotification(id).catch(() => {});
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-[500] backdrop-blur-sm" onClick={onClose}>
      <div className="fixed top-[70px] right-5 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden z-[501] animate-[slideDown_0.25s_ease] max-sm:w-[calc(100vw-32px)] max-sm:right-4"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4.5 flex justify-between items-center"
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
          <div>
            <h3 className="text-white text-base font-extrabold m-0">Notifications</h3>
            {unreadCount > 0 && <span className="text-white/80 text-xs font-semibold">{unreadCount} unread</span>}
          </div>
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="bg-white/20 text-white border-none px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer">
                Mark all read
              </button>
            )}
            <button onClick={onClose}
              className="bg-white/20 text-white border-none w-7 h-7 rounded-full text-lg cursor-pointer flex items-center justify-center">
              ×
            </button>
          </div>
        </div>

        <div className="px-4 py-2 flex gap-2 border-b border-gray-100 overflow-x-auto">
          {['', 'new_matching_job', 'application_update', 'new_application', 'system'].map(type => (
            <button key={type || 'all'} onClick={() => setFilter(type)}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${filter === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              {type ? type.replaceAll('_', ' ') : 'All'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center p-10 text-gray-400 text-sm gap-2">
              <span className="text-4xl">🔔</span>
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 cursor-pointer transition-colors relative group ${!n.read ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                onClick={() => markRead(n.id)}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: TYPE_COLORS[n.type] + '20', color: TYPE_COLORS[n.type] }}>
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-gray-900 mb-0.5">{n.title}</div>
                  <div className="text-xs text-gray-500 leading-snug">{n.message}</div>
                  <div className="text-[11px] text-gray-400 mt-1">{n.time}</div>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: TYPE_COLORS[n.type] }} />}
                <button
                  className="bg-transparent border-none text-gray-400 text-base cursor-pointer px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}>
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export { Notifications, SAMPLE_NOTIFICATIONS };
export default Notifications;
