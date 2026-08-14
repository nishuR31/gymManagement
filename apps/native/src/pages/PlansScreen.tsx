import React, { useEffect, useMemo, useState, SetStateAction } from 'react';
import { View, Text, ScrollView, Modal, TouchableOpacity, Alert, Switch } from 'react-native';
import { Beef, ClipboardList, Dumbbell, Pencil, Plus, Search, Timer, Trash2, UserRound, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import * as memberApi from '../features/members/memberApi';
import * as staffApi from '../features/staff/staffApi';
import { useAppSelector } from '../store/hooks';
import { getApiErrorMessage } from '../utils/apiError';
import { isAdminRole } from '../utils/roles';
import type { DietMealDto, DietPlanTemplateDto, MemberDto, StaffProfileDto, WorkoutExerciseDto, WorkoutPlanTemplateDto } from '@gym/shared';
import { themeColors } from '../constants/colors';

type TemplateKind = 'workout' | 'diet';
type EditableTemplate = WorkoutPlanTemplateDto | DietPlanTemplateDto | null;

export function PlansScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const theme = useAppSelector((state) => state.theme.theme);
  const activeColors = themeColors[theme === 'dark' ? 'dark' : 'light'];

  const [workouts, setWorkouts] = useState<WorkoutPlanTemplateDto[]>([]);
  const [diets, setDiets] = useState<DietPlanTemplateDto[]>([]);
  const [profiles, setProfiles] = useState<StaffProfileDto[]>([]);
  const [kind, setKind] = useState<TemplateKind>('workout');
  const [templateOpen, setTemplateOpen] = useState<TemplateKind | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EditableTemplate>(null);
  const [assignOpen, setAssignOpen] = useState<TemplateKind | null>(null);

  const ownTrainerProfile = useMemo(() => profiles.find((profile) => profile.userId === user?.id && profile.role === 'TRAINER') ?? null, [profiles, user?.id]);
  const canPickTrainer = isAdminRole(user?.role);

  const load = async (): Promise<void> => {
    try {
      const [workoutRows, dietRows, profileRows] = await Promise.all([
        staffApi.listWorkoutTemplates(),
        staffApi.listDietTemplates(),
        staffApi.listProfiles().catch(() => [])
      ]);
      setWorkouts(workoutRows);
      setDiets(dietRows);
      setProfiles(profileRows);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load plans', text2: getApiErrorMessage(error) });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeTemplates = kind === 'workout' ? workouts : diets;

  const openNewTemplate = (nextKind: TemplateKind): void => {
    setEditingTemplate(null);
    setTemplateOpen(nextKind);
  };

  const openEditTemplate = (nextKind: TemplateKind, template: EditableTemplate): void => {
    setEditingTemplate(template);
    setTemplateOpen(nextKind);
  };

  const deleteTemplate = (nextKind: TemplateKind, template: WorkoutPlanTemplateDto | DietPlanTemplateDto): void => {
    Alert.alert('Delete Template', `Delete ${template.name}? Existing member assignments will remain in history.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (nextKind === 'workout') {
            await staffApi.deleteWorkoutTemplate(template.id);
          } else {
            await staffApi.deleteDietTemplate(template.id);
          }
          Toast.show({ type: 'success', text1: 'Template deleted' });
          await load();
        } catch (error) {
          Toast.show({ type: 'error', text1: 'Could not delete template', text2: getApiErrorMessage(error) });
        }
      }}
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background p-4">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Text className="text-xs font-black uppercase tracking-[2px] text-primary">Training Library</Text>
          <Text className="mt-2 text-3xl font-black text-foreground">Workout & Diet</Text>
          <Text className="mt-1 text-sm font-semibold text-muted-foreground mb-4">Template library and member assignments</Text>
          <View className="flex-row flex-wrap gap-2">
            <Button variant="secondary" className="px-3" onPress={() => openNewTemplate('workout')}>New Workout</Button>
            <Button variant="secondary" className="px-3" onPress={() => openNewTemplate('diet')}>New Diet</Button>
            <Button className="px-3" onPress={() => setAssignOpen(kind)}>{`Assign ${kind}`}</Button>
          </View>
        </CardContent>
      </Card>

      <View className="flex-row rounded-md border border-border bg-card p-1 mb-6 self-start">
        {(['workout', 'diet'] as const).map((item) => (
          <TouchableOpacity
            key={item}
            className={`px-4 py-2 rounded ${kind === item ? 'bg-primary' : 'bg-transparent'}`}
            onPress={() => setKind(item)}
          >
            <Text className={`text-sm font-bold capitalize ${kind === item ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{kind === 'workout' ? 'Workout Templates' : 'Diet Templates'}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeTemplates.length === 0 ? <EmptyState title="No templates yet" /> : null}
          {activeTemplates.map((template) => (
            <View key={template.id} className="rounded-lg border border-border bg-background p-4 mb-4">
              <View className="flex-row items-start justify-between mb-4">
                <View className="flex-1">
                  <Text className="font-black text-foreground">{template.name}</Text>
                  <Text className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Template</Text>
                </View>
                <View className="h-11 w-11 items-center justify-center rounded-md bg-secondary">
                  {'exercises' in template ? <Dumbbell size={20} color={activeColors.primary} /> : <Beef size={20} color={activeColors.primary} />}
                </View>
              </View>
              
              <View className="flex-row flex-wrap gap-2 mb-3">
                <Button variant="secondary" className="h-9 px-3" onPress={() => openEditTemplate(kind, template)}>Edit</Button>
                <Button variant="secondary" className="h-9 px-3 text-destructive" onPress={() => deleteTemplate(kind, template)}>Delete</Button>
              </View>

              <View className="flex-row flex-wrap gap-2 mb-3">
                <View className="flex-row items-center gap-1.5 rounded bg-secondary px-2 py-1">
                  <ClipboardList size={14} color={activeColors.primary} />
                  <Text className="text-xs font-bold text-muted-foreground">
                    {'exercises' in template ? template.exercises.length : template.meals.length} {'exercises' in template ? 'exercises' : 'meals'}
                  </Text>
                </View>
                {'exercises' in template && (
                  <View className="flex-row items-center gap-1.5 rounded bg-secondary px-2 py-1">
                    <Timer size={14} color={activeColors.primary} />
                    <Text className="text-xs font-bold text-muted-foreground">{(template.exercises.length * 8)} min est.</Text>
                  </View>
                )}
              </View>

              <View className="mt-3 gap-2">
                {'exercises' in template
                  ? template.exercises.map((exercise, index) => (
                      <View key={`${template.id}-${index}`} className="flex-row justify-between">
                        <Text className="text-sm text-muted-foreground flex-1">{exercise.name}</Text>
                        <Text className="text-sm font-semibold text-muted-foreground">{exercise.sets} x {exercise.reps}</Text>
                      </View>
                    ))
                  : template.meals.map((meal, index) => (
                      <View key={`${template.id}-${index}`} className="flex-row justify-between">
                        <Text className="text-sm text-muted-foreground flex-1">{meal.name}</Text>
                        <Text className="text-sm font-semibold text-muted-foreground">{meal.calories} cal</Text>
                      </View>
                    ))}
              </View>
            </View>
          ))}
        </CardContent>
      </Card>

      <TemplateModal kind={templateOpen} template={editingTemplate} onClose={() => setTemplateOpen(null)} onSaved={() => void load()} activeColors={activeColors} />
      <AssignModal
        kind={assignOpen}
        templates={assignOpen === 'workout' ? workouts : diets}
        trainerProfiles={profiles.filter((profile) => profile.role === 'TRAINER')}
        canPickTrainer={canPickTrainer}
        ownTrainerId={ownTrainerProfile?.id ?? null}
        onClose={() => setAssignOpen(null)}
        activeColors={activeColors}
      />
      
      <View className="h-12" />
    </ScrollView>
  );
}

function TemplateModal({ kind, template, onClose, onSaved, activeColors }: any) {
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExerciseDto[]>([{ name: '', sets: 3, reps: 10 }]);
  const [meals, setMeals] = useState<DietMealDto[]>([{ name: '', calories: 350, proteinGrams: 20, carbsGrams: 35, fatGrams: 10 }]);

  useEffect(() => {
    if (!kind) return;
    setName(template?.name ?? '');
    if (kind === 'workout') {
      setExercises(template && 'exercises' in template ? template.exercises : [{ name: '', sets: 3, reps: 10 }]);
    } else {
      setMeals(template && 'meals' in template ? template.meals : [{ name: '', calories: 350, proteinGrams: 20, carbsGrams: 35, fatGrams: 10 }]);
    }
  }, [kind, template]);

  const submit = async (): Promise<void> => {
    if (!kind) return;
    try {
      if (kind === 'workout') {
        const payload = { name, exercises: exercises.filter((exercise) => exercise.name.trim()) };
        if (template?.id) {
          await staffApi.updateWorkoutTemplate(template.id, payload);
        } else {
          await staffApi.createWorkoutTemplate(payload);
        }
      } else {
        const payload = { name, meals: meals.filter((meal) => meal.name.trim()) };
        if (template?.id) {
          await staffApi.updateDietTemplate(template.id, payload);
        } else {
          await staffApi.createDietTemplate(payload);
        }
      }
      Toast.show({ type: 'success', text1: template?.id ? 'Template updated' : 'Template created' });
      onClose();
      onSaved();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not save template', text2: getApiErrorMessage(error) });
    }
  };

  const updateExercise = (index: number, patch: Partial<WorkoutExerciseDto>) => {
    setExercises((current) => current.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const updateMeal = (index: number, patch: Partial<DietMealDto>) => {
    setMeals((current) => current.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  return (
    <Modal visible={!!kind} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background pt-10">
        <ScrollView className="p-4">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-foreground">{template?.id ? 'Edit' : 'New'} {kind === 'workout' ? 'Workout' : 'Diet'} Template</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={activeColors.foreground} /></TouchableOpacity>
          </View>
          
          <Input label="Template Name" value={name} onChangeText={setName} />
          
          {kind === 'workout' ? (
            <View className="gap-4 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-foreground">Exercises</Text>
                <Button variant="secondary" className="px-3 h-9" onPress={() => setExercises((c) => [...c, { name: '', sets: 3, reps: 10 }])}>Add</Button>
              </View>
              {exercises.map((exercise, index) => (
                <View key={index} className="rounded-md border border-border bg-card p-3 mb-2">
                  <Input label="Exercise" value={exercise.name} onChangeText={(val) => updateExercise(index, { name: val })} />
                  <View className="flex-row gap-2">
                    <View className="flex-1"><Input label="Sets" keyboardType="numeric" value={String(exercise.sets)} onChangeText={(val) => updateExercise(index, { sets: Number(val) })} /></View>
                    <View className="flex-1"><Input label="Reps" keyboardType="numeric" value={String(exercise.reps)} onChangeText={(val) => updateExercise(index, { reps: Number(val) })} /></View>
                  </View>
                  <Button variant="secondary" className="bg-destructive/10" onPress={() => setExercises((c) => c.filter((_, i) => i !== index))}>
                    <Text className="text-destructive font-bold">Remove</Text>
                  </Button>
                </View>
              ))}
            </View>
          ) : (
            <View className="gap-4 mb-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-foreground">Meals</Text>
                <Button variant="secondary" className="px-3 h-9" onPress={() => setMeals((c) => [...c, { name: '', calories: 350, proteinGrams: 20, carbsGrams: 35, fatGrams: 10 }])}>Add</Button>
              </View>
              {meals.map((meal, index) => (
                <View key={index} className="rounded-md border border-border bg-card p-3 mb-2">
                  <Input label="Meal" value={meal.name} onChangeText={(val) => updateMeal(index, { name: val })} />
                  <View className="flex-row gap-2">
                    <View className="flex-1"><Input label="Cal" keyboardType="numeric" value={String(meal.calories)} onChangeText={(val) => updateMeal(index, { calories: Number(val) })} /></View>
                    <View className="flex-1"><Input label="Pro" keyboardType="numeric" value={String(meal.proteinGrams)} onChangeText={(val) => updateMeal(index, { proteinGrams: Number(val) })} /></View>
                    <View className="flex-1"><Input label="Car" keyboardType="numeric" value={String(meal.carbsGrams)} onChangeText={(val) => updateMeal(index, { carbsGrams: Number(val) })} /></View>
                    <View className="flex-1"><Input label="Fat" keyboardType="numeric" value={String(meal.fatGrams)} onChangeText={(val) => updateMeal(index, { fatGrams: Number(val) })} /></View>
                  </View>
                  <Button variant="secondary" className="bg-destructive/10" onPress={() => setMeals((c) => c.filter((_, i) => i !== index))}>
                    <Text className="text-destructive font-bold">Remove</Text>
                  </Button>
                </View>
              ))}
            </View>
          )}

          <Button onPress={submit} className="mt-4">{template?.id ? 'Save Template' : 'Create Template'}</Button>
          <View className="h-12" />
        </ScrollView>
      </View>
    </Modal>
  );
}

function AssignModal({ kind, templates, trainerProfiles, canPickTrainer, ownTrainerId, onClose, activeColors }: any) {
  const [memberId, setMemberId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<MemberDto[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (kind) {
      setTemplateId(templates[0]?.id ?? '');
      setMemberId('');
      setMemberSearch('');
      setMemberResults([]);
      setSelectedMember(null);
      setStartDate(new Date().toISOString().slice(0, 10));
    }
  }, [kind, templates, trainerProfiles]);

  useEffect(() => {
    const query = memberSearch.trim();
    if (query.length < 2 || selectedMember) {
      setMemberResults([]);
      return;
    }
    const timer = setTimeout(() => {
      memberApi.listMembers({ page: 1, pageSize: 8, search: query })
        .then((response) => setMemberResults(response.data))
        .catch(() => Toast.show({ type: 'error', text1: 'Could not search members' }));
    }, 250);
    return () => clearTimeout(timer);
  }, [memberSearch, selectedMember]);

  const submit = async (): Promise<void> => {
    if (!kind) return;
    const payload = { memberId, templateId, startDate };
    try {
      if (kind === 'workout') {
        await staffApi.assignWorkout(payload);
      } else {
        await staffApi.assignDiet(payload);
      }
      Toast.show({ type: 'success', text1: 'Plan assigned' });
      onClose();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not assign plan', text2: getApiErrorMessage(error) });
    }
  };

  return (
    <Modal visible={!!kind} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-background pt-10">
        <ScrollView className="p-4">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-foreground">Assign {kind === 'workout' ? 'Workout' : 'Diet'} Plan</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={activeColors.foreground} /></TouchableOpacity>
          </View>
          
          <View className="mb-4">
            <Input label="Search member" placeholder="Name, member ID..." value={memberSearch} onChangeText={(text) => {
              setMemberSearch(text);
              setSelectedMember(null);
              setMemberId('');
            }} />
            
            {selectedMember ? (
              <View className="flex-row items-center gap-3 rounded-md border border-primary/40 bg-secondary p-3 mt-2">
                <UserRound size={20} color={activeColors.primary} />
                <View>
                  <Text className="text-sm font-black text-foreground">{selectedMember.firstName} {selectedMember.lastName}</Text>
                  <Text className="text-xs font-semibold text-muted-foreground">{selectedMember.memberCode}</Text>
                </View>
              </View>
            ) : null}

            {memberResults.length > 0 ? (
              <View className="mt-2 rounded-md border border-border bg-background shadow-sm">
                {memberResults.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    className="flex-row items-center gap-3 border-b border-border p-3"
                    onPress={() => {
                      setSelectedMember(member);
                      setMemberId(member.id);
                      setMemberSearch(`${member.firstName} ${member.lastName}`);
                      setMemberResults([]);
                    }}
                  >
                    <UserRound size={16} color={activeColors.primary} />
                    <View>
                      <Text className="text-sm font-bold text-foreground">{member.firstName} {member.lastName}</Text>
                      <Text className="text-xs text-muted-foreground">{member.memberCode}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-foreground">Template</Text>
            <View className="gap-2">
              {templates.map((t: any) => (
                <TouchableOpacity
                  key={t.id}
                  className={`p-3 rounded-md border ${templateId === t.id ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                  onPress={() => setTemplateId(t.id)}
                >
                  <Text className={`font-bold ${templateId === t.id ? 'text-primary' : 'text-foreground'}`}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
          
          <Button onPress={submit} disabled={!memberId || !templateId} className="mt-4">Assign</Button>
          <View className="h-12" />
        </ScrollView>
      </View>
    </Modal>
  );
}
