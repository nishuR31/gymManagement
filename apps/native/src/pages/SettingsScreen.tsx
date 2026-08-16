import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import {
  Building2,
  Clock3,
  FileText,
  Percent,
  Settings as SettingsIcon,
  Moon,
  Sun,
  MoonStar,
  Paintbrush,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { ScreenWrapper, PageHeader } from '../components/layout/ScreenWrapper';
import { useTheme } from '../hooks/useTheme';
import * as settingsApi from '../features/settings/settingsApi';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setTheme, setStyleMode } from '../features/theme/themeSlice';
import { formatDateTime, readableStatus } from '../utils/format';
import { isAdminRole } from '../utils/roles';
import type { SettingDto } from '@gym/shared';

const defaultKeys = ['gym-details', 'business-hours', 'tax-rate', 'receipt-template', 'general-config'];
const firstDefaultKey = defaultKeys[0];

export function SettingsScreen() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const dispatch = useAppDispatch();
  const { theme, styleMode, colors } = useTheme();

  const [settings, setSettings] = useState<SettingDto[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>(firstDefaultKey);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const selected = useMemo(
    () => settings.find((s) => s.key === selectedKey),
    [selectedKey, settings],
  );

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const rows = await settingsApi.listSettings();
      setSettings(rows);
      const firstKey = rows[0]?.key ?? firstDefaultKey;
      setSelectedKey((current) => current || firstKey);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    setDraft(JSON.stringify(selected?.value ?? defaultValueForKey(selectedKey), null, 2));
  }, [selected, selectedKey]);

  const keys = useMemo(
    () => [...new Set([...defaultKeys, ...settings.map((s) => s.key)])],
    [settings],
  );

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
        Toast.show({ type: 'error', text1: 'Value must be valid JSON' });
        return;
      }
      Toast.show({ type: 'error', text1: 'Could not save setting' });
    }
  };

  return (
    <ScreenWrapper>
      <PageHeader
        label="Control Room"
        title="Settings"
        subtitle="Gym details, business rules, receipts, and runtime config."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'amoled' : 'light';
              dispatch(setTheme(next));
            }}
          >
            {theme === 'amoled' ? (
              <MoonStar size={16} color={colors.foreground} />
            ) : theme === 'dark' ? (
              <Moon size={16} color={colors.foreground} />
            ) : (
              <Sun size={16} color={colors.foreground} />
            )}
          </Button>
        }
      />

      {/* Styling */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>UI Styling</CardTitle>
        </CardHeader>
        <CardContent>

          <View>
            <View className="mb-3">
              <View className="flex-row items-center gap-2">
                <Paintbrush size={16} color={colors.foreground} />
                <Text className="text-sm font-bold text-foreground">Styling Paradigm</Text>
              </View>
              <Text className="text-xs text-muted-foreground mt-1">Change the overall shape and feel of UI components.</Text>
            </View>
            <View className="flex-row gap-2 flex-wrap">
              {(['minimal', 'glass', 'clay', 'liquid-glass'] as const).map((s) => (
                <Button
                  key={s}
                  variant={styleMode === s ? 'primary' : 'secondary'}
                  onPress={() => dispatch(setStyleMode(s))}
                  className="w-[48%] mb-2"
                  size="sm"
                >
                  {s === 'liquid-glass' ? 'Liquid Glass' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Setting group selector */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Setting Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && keys.length === 0 ? (
            <EmptyState title="No settings found" />
          ) : null}
          <View className="gap-2">
            {keys.map((key) => {
              const Icon = iconForKey(key);
              const isSelected = selectedKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={{
                    backgroundColor: isSelected ? colors.primary : colors.secondary,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-3 border"
                  onPress={() => setSelectedKey(key)}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={20}
                    color={isSelected ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <View className="flex-1">
                    <Text
                      style={{ color: isSelected ? colors.primaryForeground : colors.foreground }}
                      className="font-bold"
                    >
                      {readableStatus(key)}
                    </Text>
                    <Text
                      style={{
                        color: isSelected
                          ? `${colors.primaryForeground}99`
                          : colors.mutedForeground,
                      }}
                      className="text-xs"
                    >
                      {descriptionForKey(key)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </CardContent>
      </Card>

      {/* Setting editor */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{readableStatus(selectedKey)}</CardTitle>
        </CardHeader>
        <CardContent>
          <View
            style={{ backgroundColor: colors.secondary }}
            className="rounded-xl p-3 mb-4"
          >
            <Input
              label="Key"
              value={selectedKey}
              onChangeText={setSelectedKey}
              editable={isAdminRole(role)}
            />
            {isAdminRole(role) && (
              <Button
                variant="secondary"
                className="mt-1"
                onPress={() =>
                  setDraft(JSON.stringify(defaultValueForKey(selectedKey), null, 2))
                }
                size="sm"
              >
                Use Template
              </Button>
            )}
          </View>

          <Text className="mb-2 text-sm font-medium text-foreground">Value (JSON)</Text>
          <TextInput
            // Use style object for min-height — className min-h is unreliable in RN
            style={{
              minHeight: 200,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.input,
              backgroundColor: colors.background,
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 13,
              color: colors.foreground,
              fontFamily: 'monospace',
              textAlignVertical: 'top',
            }}
            multiline
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
            <Text className="mt-2 text-xs font-semibold text-muted-foreground">
              This key will be created when saved.
            </Text>
          )}

          {isAdminRole(role) && (
            <Button className="mt-4" onPress={save}>
              Save Setting
            </Button>
          )}
        </CardContent>
      </Card>
    </ScreenWrapper>
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
  if (key === 'gym-details')
    return { name: 'Single Gym', phone: '', email: '', address: '' };
  if (key === 'business-hours')
    return {
      monday: '06:00-22:00', tuesday: '06:00-22:00', wednesday: '06:00-22:00',
      thursday: '06:00-22:00', friday: '06:00-22:00',
      saturday: '08:00-20:00', sunday: '08:00-14:00',
    };
  if (key === 'tax-rate') return { percent: 0 };
  if (key === 'receipt-template') return { footer: 'Thank you for training with us.' };
  return {};
}
