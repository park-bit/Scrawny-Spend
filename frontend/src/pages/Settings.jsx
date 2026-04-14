import { useState } from 'react';
import { LogOut, Save, Shield, User as UserIcon } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { authService } from '../services';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, updateSession, logout } = useAuthStore();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    currency: user?.currency || 'INR',
    geminiApiKey: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isPassLoading, setIsPassLoading] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { name: profile.name, currency: profile.currency };
      if (profile.geminiApiKey.trim()) payload.geminiApiKey = profile.geminiApiKey;
      
      const { data } = await authService.updateMe(payload);
      // The API returns fresh sync token pair + user
      updateSession(data.data);
      toast.success('Profile updated securely.');
      setProfile((prev) => ({ ...prev, geminiApiKey: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setIsPassLoading(true);
    try {
      await authService.changePassword(passwords);
      toast.success('Password updated successfully.');
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setIsPassLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account preferences and security.</p>
      </div>

      {/* Profile Section */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4 text-amber-400">
          <UserIcon size={20} />
          <h2 className="font-semibold">Profile Options</h2>
        </div>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input 
              type="text" 
              className="input" 
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required 
            />
          </div>
          <div>
            <label className="label">Base Currency</label>
            <select 
              className="input appearance-none bg-navy-900 text-slate-200"
              value={profile.currency}
              onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="label">Gemini API Key (Optional)</label>
            <input 
              type="password" 
              className="input" 
              placeholder={user?.hasGeminiKey ? '••••••••••••••••••••••••' : 'Enter your Gemini API key'}
              value={profile.geminiApiKey}
              onChange={(e) => setProfile({ ...profile, geminiApiKey: e.target.value })}
            />
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Supply your own Gemini 1.5 Flash key for the AI advisor.</span>
              {user?.hasGeminiKey && <span className="text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded-md text-[10px]">Saved Securely</span>}
            </p>
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save size={18} />
            {isLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </section>

      {/* Security Section */}
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-4 text-red-400">
          <Shield size={20} />
          <h2 className="font-semibold">Security</h2>
        </div>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input 
              type="password" 
              className="input" 
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required 
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input 
              type="password" 
              className="input" 
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required 
              minLength={8}
            />
          </div>
          <button type="submit" disabled={isPassLoading} className="btn-ghost text-red-400 hover:text-red-300 w-full flex items-center justify-center gap-2 border-red-500/20 hover:border-red-500/40">
            {isPassLoading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Logout */}
      <button onClick={handleLogout} className="glass w-full p-4 flex items-center justify-center gap-2 text-slate-400 hover:text-red-400 transition-colors">
        <LogOut size={18} />
        <span className="font-medium">Sign out completely</span>
      </button>
    </div>
  );
}
