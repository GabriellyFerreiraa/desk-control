import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/layout/AppHeader';
import { User, Bell, Shield, Moon, Sun, Monitor, Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLang, useT } from '@/i18n/lang';
import { LANGS, LANG_LABELS, STRINGS, isLang } from '@/i18n/strings';
const Settings = () => {
  const { userProfile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang } = useLang();
  const t = useT();
  const ts = t.settingsPage;

  const handleLanguageChange = async (value: string) => {
    if (!isLang(value)) return;
    try {
      await setLang(value);
      // Confirm in the language just picked, not the one being left.
      toast({ title: STRINGS[value].settings.languageSaved });
      await refreshProfile?.();
    } catch (error) {
      console.error('Error saving language:', error);
      toast({ title: t.common.error, variant: 'destructive' });
    }
  };
  const {
    theme,
    setTheme
  } = useTheme();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: userProfile?.name || '',
    area: userProfile?.area || ''
  });

  // Notification preferences aren't wired to any actual notification
  // sender in this app yet, so the controls below are disabled and
  // labeled "Coming soon" rather than pretending to save a setting.
  const [notifications] = useState({
    email: false,
    desktop: false,
    taskReminders: false,
    absenceUpdates: false
  });

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: ts.passwordTooShort, description: ts.passwordTooShortBody, variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: ts.passwordMismatch, variant: 'destructive' });
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: ts.passwordUpdated, description: ts.passwordUpdatedBody });
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast({ title: t.common.error, description: ts.passwordFailed, variant: 'destructive' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // Avatar upload handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarClick = () => fileInputRef.current?.click();
  const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
  const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast({ title: ts.avatarType, description: ts.avatarTypeBody, variant: 'destructive' });
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast({ title: ts.avatarTooBig, description: ts.avatarTooBigBody, variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setLoading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase
        .storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: cacheBustedUrl })
        .eq('user_id', user.id);
      if (updateError) throw updateError;

      toast({ title: ts.avatarUpdated, description: ts.avatarUpdatedBody });
      await refreshProfile?.();
    } catch (err) {
      console.error('Avatar upload error', err);
      toast({ title: ts.avatarFailed, description: ts.avatarFailedBody, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        name: profileData.name,
        area: profileData.area
      }).eq('user_id', user.id);
      if (error) throw error;
      toast({
        title: ts.profileSaved
      });
      await refreshProfile?.();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t.common.error,
        description: ts.profileSaveFailed,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader crumbs={[{ label: t.header.settings }]} />

      <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Profile Settings */}
        <Card className="bg-[hsl(var(--panel))]">
          <CardHeader className="bg-[hsl(var(--panel))]">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {ts.profileTitle}
            </CardTitle>
            <CardDescription>
              {ts.profileDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 bg-[hsl(var(--panel))]">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={userProfile?.avatar_url} />
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button variant="outline" size="sm" onClick={handleAvatarClick} disabled={loading} >
                  {ts.changeAvatar}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  {ts.avatarHint}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{ts.name}</Label>
                <Input id="name" value={profileData.name} onChange={e => setProfileData(prev => ({
                ...prev,
                name: e.target.value
              }))} placeholder={ts.namePlaceholder} className="bg-[hsl(var(--field))]" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">{ts.workArea}</Label>
                <Input id="area" value={profileData.area} onChange={e => setProfileData(prev => ({
                ...prev,
                area: e.target.value
              }))} placeholder={ts.workAreaPlaceholder} className="bg-[hsl(var(--field))]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{ts.email}</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {ts.emailLocked}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{ts.role}</Label>
                <Input value={(t.roles as Record<string, string>)[userProfile?.role] ?? userProfile?.role ?? ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  {ts.roleLocked}
                </p>
              </div>
            </div>

            <Button onClick={handleProfileUpdate} disabled={loading}>
              {loading ? t.common.saving : ts.saveChanges}
            </Button>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card className="bg-[hsl(var(--panel))]">
          <CardHeader className="bg-[hsl(var(--panel))]">
            <CardTitle className="flex items-center gap-2">
              {getThemeIcon()}
              {ts.appearanceTitle}
            </CardTitle>
            <CardDescription>
              {ts.appearanceDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 bg-[hsl(var(--panel))]">
            <div className="flex items-center justify-between">
              <div>
                <Label>{ts.theme}</Label>
                <p className="text-sm text-muted-foreground">
                  {ts.themeHint}
                </p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{ts.themes.system}</SelectItem>
                  <SelectItem value="light">{ts.themes.light}</SelectItem>
                  <SelectItem value="dark">{ts.themes.dark}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card className="bg-[hsl(var(--panel))]">
          <CardHeader className="bg-[hsl(var(--panel))]">
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              {t.settings.languageTitle}
            </CardTitle>
            <CardDescription>
              {t.settings.languageDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 bg-[hsl(var(--panel))]">
            <div className="flex items-center justify-between">
              <Label htmlFor="language">{t.settings.languageLabel}</Label>
              <Select value={lang} onValueChange={handleLanguageChange}>
                <SelectTrigger id="language" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((code) => (
                    <SelectItem key={code} value={code}>{LANG_LABELS[code]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-[hsl(var(--panel))]">
          <CardHeader className="bg-[hsl(var(--panel))]">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {ts.notificationsTitle}
              <Badge variant="outline" className="ml-2 font-normal">{ts.comingSoon}</Badge>
            </CardTitle>
            <CardDescription>
              {ts.notificationsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 bg-[hsl(var(--panel))]">
            <div className="flex items-center justify-between">
              <div>
                <Label>{ts.emailNotifications}</Label>
                <p className="text-sm text-muted-foreground">
                  {ts.emailNotificationsHint}
                </p>
              </div>
              <Switch checked={notifications.email} disabled />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>{ts.desktopNotifications}</Label>
                <p className="text-sm text-muted-foreground">
                  {ts.desktopNotificationsHint}
                </p>
              </div>
              <Switch checked={notifications.desktop} disabled />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>{ts.taskReminders}</Label>
                <p className="text-sm text-muted-foreground">
                  {ts.taskRemindersHint}
                </p>
              </div>
              <Switch checked={notifications.taskReminders} disabled />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>{ts.absenceUpdates}</Label>
                <p className="text-sm text-muted-foreground">
                  {ts.absenceUpdatesHint}
                </p>
              </div>
              <Switch checked={notifications.absenceUpdates} disabled />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-[hsl(var(--panel))]">
          <CardHeader className="bg-[hsl(var(--panel))]">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {ts.securityTitle}
            </CardTitle>
            <CardDescription>
              {ts.securityDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 bg-[hsl(var(--panel))]">
            <div className="flex items-center justify-between">
              <div>
                <Label>{ts.changePassword}</Label>
                <p className="text-sm text-muted-foreground">
                  {ts.changePasswordHint}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(true)}>
                {ts.changePassword}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  {ts.twoFactor}
                  <Badge variant="outline" className="font-normal">{ts.comingSoon}</Badge>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {ts.twoFactorHint}
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                {ts.enable2fa}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={showPasswordDialog} onOpenChange={(open) => { setShowPasswordDialog(open); if (!open) { setNewPassword(''); setConfirmPassword(''); } }}>
        <DialogContent className="sm:max-w-md bg-[hsl(var(--panel))]">
          <DialogHeader>
            <DialogTitle>{ts.changePassword}</DialogTitle>
            <DialogDescription>{ts.passwordDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-password">{ts.newPassword}</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" autoComplete="new-password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{ts.confirmPassword}</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" autoComplete="new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} disabled={passwordSaving}>{t.common.cancel}</Button>
            <Button onClick={handleChangePassword} disabled={passwordSaving}>
              {passwordSaving ? t.common.saving : ts.updatePassword}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Settings;