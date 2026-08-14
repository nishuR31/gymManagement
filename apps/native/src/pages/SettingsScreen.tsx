import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Building2, Clock3, FileText, Percent, Settings as SettingsIcon } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import * as settingsApi from '../features/settings/settingsApi';
import { useAppSelector } from '../store/hooks';
import { getApiErrorMessage } from '../utils/apiError';
import { formatDateTime, readableStatus } from '../utils/format';
import { isAdminRole } from '../utils/roles';
import type { SettingDto } from '@gym/shared';
import { themeColors } from '../constants/colors';

const defaultKeys = ['gym-details', 'business-hours', 'tax-rate', 'receipt-template', 'general-config'];
const firstDefaultKey = defaultKeys[0];

export function SettingsScreen() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [settings, setSettings] = useState<SettingDto[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(firstDefaultKey);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const selected = useMemo(() => settings.find((setting) => setting.key === selectedKey), [selectedKey, settings]);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await settingsApi.listSettings();
      setSettings(rows);
      const firstKey = rows[0]?.key ?? firstDefaultKey;
      setSelectedKey((current) => current || firstKey);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load settings', text2: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setDraft(JSON.stringify(selected?.value ?? defaultValueForKey(selectedKey), null, 2));
  }, [selected, selectedKey]);

  const keys = useMemo(() => [...new Set([...defaultKeys, ...settings.map((setting) => setting.key)])], [settings]);

  const save = async (): Promise<void> => {
    try {
      const value = JSON.parse(draft) as unknown;
      const setting = await settingsApi.updateSetting(selectedKey, value);
      setSettings((current) => {
        const remaining = current.filter((item) => item.key !== setting.key);
        return [...remaining, setting].sort((a, b) => a.key.localeCompare(b.key));
      });
      Toast.show({ type: 'success', text1: 'Setting saved' });
    } catch (error) {
      if (error instanceof SyntaxError) {
        Toast.show({ type: 'error', text1: 'Setting value must be valid JSON' });
        return;
      }
      Toast.show({ type: 'error', text1: 'Could not save setting', text2: getApiErrorMessage(error) });
    }
  };

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Text className="text-xs font-black uppercase tracking-[2px] text-primary">Control Room</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Settings</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground">Gym details, business rules, receipts, and runtime config.</Text>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Setting Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && keys.length === 0 ? <EmptyState title="No settings found" /> : null}
          <View className="gap-2">
            {keys.map((key) => {
              const Icon = iconForKey(key);
              const isSelected = selectedKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  className={`flex-row items-center gap-3 rounded-md px-3 py-3 border ${isSelected ? 'border-primary bg-primary' : 'border-border bg-card'}`}
                  onPress={() => setSelectedKey(key)}
                >
                  <Icon size={20} color={isSelected ? activeColors.primaryForeground : activeColors.mutedForeground} />
                  <View className="flex-1">
                    <Text className={`font-bold ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>{readableStatus(key)}</Text>
                    <Text className={`text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{descriptionForKey(key)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{readableStatus(selectedKey)}</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="rounded-md bg-secondary p-3 mb-4">
            <Input label="Key" value={selectedKey} onChangeText={setSelectedKey} editable={isAdminRole(role)} />
            {isAdminRole(role) && (
              <Button variant="secondary" className="mt-2" onPress={() => setDraft(JSON.stringify(defaultValueForKey(selectedKey), null, 2))}>
                Use Template
              </Button>
            )}
          </View>
          
          <Text className="mb-2 text-sm font-medium text-foreground">Value JSON</Text>
          <TextInput
            className="min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            multiline
            textAlignVertical="top"
            value={draft}
            onChangeText={setDraft}
            editable={isAdminRole(role)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {selected ? (
            <Text className="mt-2 text-xs font-semibold text-muted-foreground">
              Last updated {formatDateTime(selected.updatedAt)} by {selected.updatedBy ?? 'system'}
            </Text>
          ) : (
            <Text className="mt-2 text-xs font-semibold text-muted-foreground">This key will be created when saved.</Text>
          )}

          {isAdminRole(role) && (
            <Button className="mt-4" onPress={save}>Save</Button>
          )}
        </CardContent>
      </Card>

      <View className="h-12" />
    </ScrollView>
  );
}

function iconForKey(key: string) {
  if (key.includes('gym')) return Building2;
  if (key.includes('hours')) return Clock3;
  if (key.includes('tax')) return Percent;
  if (key.includes('receipt')) return FileText;
  return SettingsIcon;
}

function descriptionForKey(key: string): string {
  if (key.includes('gym')) return 'Name, contact, and address';
  if (key.includes('hours')) return 'Daily opening windows';
  if (key.includes('tax')) return 'Billing percentage';
  if (key.includes('receipt')) return 'Printed receipt copy';
  return 'Custom runtime JSON';
}

function defaultValueForKey(key: string): unknown {
  if (key === 'gym-details') return { name: 'Single Gym', phone: '', email: '', address: '' };
  if (key === 'business-hours') return { monday: '06:00-22:00', tuesday: '06:00-22:00', wednesday: '06:00-22:00', thursday: '06:00-22:00', friday: '06:00-22:00', saturday: '08:00-20:00', sunday: '08:00-14:00' };
  if (key === 'tax-rate') return { percent: 0 };
  if (key === 'receipt-template') return { footer: 'Thank you for training with us.' };
  return {};
}
