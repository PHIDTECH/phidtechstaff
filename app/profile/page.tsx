"use client";
export const dynamic = "force-dynamic";
import { useState, useRef, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCircle, Camera, Save, Lock, Mail, Phone, Briefcase, Building2, CheckCircle } from "lucide-react";
import { getInitials } from "@/lib/utils";

const PROFILE_KEY = "phidtech_profile";
const PHOTO_KEY = "phidtech_profile_photo";

interface Profile {
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  role: string;
}

const defaultProfile: Profile = {
  name: "System Administrator",
  email: "phidtechnology@gmail.com",
  phone: "+255 700 000 000",
  position: "System Administrator",
  department: "Administration",
  role: "Admin",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [photo, setPhoto] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (stored) setProfile(JSON.parse(stored));
      const storedPhoto = localStorage.getItem(PHOTO_KEY);
      if (storedPhoto) setPhoto(storedPhoto);
    } catch {}
  }, []);

  const saveProfile = () => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhoto(dataUrl);
      try { localStorage.setItem(PHOTO_KEY, dataUrl); } catch {}
    };
    reader.readAsDataURL(file);
  };

  const savePassword = () => {
    setPwError("");
    if (!pwForm.current) { setPwError("Enter current password."); return; }
    if (pwForm.newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    setPwSaved(true);
    setPwForm({ current: "", newPw: "", confirm: "" });
    setTimeout(() => setPwSaved(false), 3000);
  };

  return (
    <MainLayout>
      <PageHeader
        title="My Profile"
        subtitle="Update your personal details and account settings"
        icon={UserCircle}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Photo & Summary Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
              {photo ? (
                <img src={photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{getInitials(profile.name)}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{profile.position}</p>
          <span className="mt-2 text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">{profile.role}</span>

          <div className="w-full mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{profile.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{profile.department}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{profile.position}</span>
            </div>
          </div>

          <button
            onClick={() => fileRef.current?.click()}
            className="mt-6 w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            Click camera icon or here to change photo
          </button>
        </div>

        {/* Edit Details */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
                <Input
                  value={profile.name}
                  onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email Address</label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number</label>
                <Input
                  value={profile.phone}
                  onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+255 700 000 000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Position / Job Title</label>
                <Input
                  value={profile.position}
                  onChange={e => setProfile(p => ({ ...p, position: e.target.value }))}
                  placeholder="e.g. System Administrator"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Department</label>
                <Input
                  value={profile.department}
                  onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                  placeholder="e.g. Administration"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Role</label>
                <Input value={profile.role} disabled className="bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={saveProfile} className="min-w-[140px]">
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </Button>
              {saved && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Profile saved successfully
                </div>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                <Lock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Change Password</h3>
                <p className="text-xs text-gray-400">Use a strong password with 8+ characters</p>
              </div>
            </div>

            {pwError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{pwError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Current Password</label>
                <Input
                  type="password"
                  value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">New Password</label>
                <Input
                  type="password"
                  value={pwForm.newPw}
                  onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm New Password</label>
                <Input
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                  placeholder="Repeat new password"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button onClick={savePassword} variant="outline" className="min-w-[160px]">
                <Lock className="w-4 h-4 mr-2" /> Update Password
              </Button>
              {pwSaved && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Password updated
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
