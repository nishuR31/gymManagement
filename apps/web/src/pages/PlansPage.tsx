import type { DietMealDto, DietPlanTemplateDto, MemberDto, StaffProfileDto, WorkoutExerciseDto, WorkoutPlanTemplateDto } from "@gym/shared";
import { useEffect, useMemo, useState, type SetStateAction } from "react";
import { Beef, ClipboardList, Dumbbell, Pencil, Plus, Search, Timer, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import * as memberApi from "../features/members/memberApi";
import * as staffApi from "../features/staff/staffApi";
import { useAppSelector } from "../store/hooks";
import { getApiErrorMessage } from "../utils/apiError";
import { isAdminRole } from "../utils/roles";

type TemplateKind = "workout" | "diet";
type EditableTemplate = WorkoutPlanTemplateDto | DietPlanTemplateDto | null;

export function PlansPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [workouts, setWorkouts] = useState<WorkoutPlanTemplateDto[]>([]);
  const [diets, setDiets] = useState<DietPlanTemplateDto[]>([]);
  const [profiles, setProfiles] = useState<StaffProfileDto[]>([]);
  const [kind, setKind] = useState<TemplateKind>("workout");
  const [templateOpen, setTemplateOpen] = useState<TemplateKind | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EditableTemplate>(null);
  const [assignOpen, setAssignOpen] = useState<TemplateKind | null>(null);

  const ownTrainerProfile = useMemo(() => profiles.find((profile) => profile.userId === user?.id && profile.role === "TRAINER") ?? null, [profiles, user?.id]);
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
      toast.error(getApiErrorMessage(error, "Could not load plans"));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeTemplates = kind === "workout" ? workouts : diets;

  const openNewTemplate = (nextKind: TemplateKind): void => {
    setEditingTemplate(null);
    setTemplateOpen(nextKind);
  };

  const openEditTemplate = (nextKind: TemplateKind, template: EditableTemplate): void => {
    setEditingTemplate(template);
    setTemplateOpen(nextKind);
  };

  const deleteTemplate = async (nextKind: TemplateKind, template: WorkoutPlanTemplateDto | DietPlanTemplateDto): Promise<void> => {
    if (!window.confirm(`Delete ${template.name}? Existing member assignments will remain in history.`)) {
      return;
    }
    try {
      if (nextKind === "workout") {
        await staffApi.deleteWorkoutTemplate(template.id);
      } else {
        await staffApi.deleteDietTemplate(template.id);
      }
      toast.success("Template deleted");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete template"));
    }
  };

  return (
    <section className="grid max-w-7xl gap-6 animate-fade-in">
      <div className="bg-card flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-4 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Training Library</p>
          <h2 className="mt-2 text-3xl font-black text-foreground">Workout & Diet Plans</h2>
          <p className="mt-1 text-sm text-muted-foreground">Template library and member assignments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openNewTemplate("workout")}><Dumbbell className="h-4 w-4" aria-hidden="true" />New Workout</Button>
          <Button variant="secondary" onClick={() => openNewTemplate("diet")}><Beef className="h-4 w-4" aria-hidden="true" />New Diet</Button>
          <Button onClick={() => setAssignOpen(kind)}><ClipboardList className="h-4 w-4" aria-hidden="true" />Assign {kind}</Button>
        </div>
      </div>

      <div className="flex w-fit rounded-md border border-border bg-card p-1">
        {(["workout", "diet"] as const).map((item) => (
          <button key={item} className={`h-9 rounded px-3 text-sm font-bold capitalize transition focus-visible:focus-ring ${kind === item ? "bg-primary text-panel" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setKind(item)}>
            {item}
          </button>
        ))}
      </div>

      <Card title={kind === "workout" ? "Workout Templates" : "Diet Templates"}>
        {activeTemplates.length === 0 ? <EmptyState title="No templates yet" /> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {activeTemplates.map((template) => (
            <div key={template.id} className="group rounded-lg border border-border bg-background p-4 shadow-sm transition hover:-translate-y-1 hover:border-brand">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-foreground">{template.name}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">Template</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-md bg-line-faint text-primary transition group-hover:scale-105">
                  {"exercises" in template ? <Dumbbell className="h-5 w-5" aria-hidden="true" /> : <Beef className="h-5 w-5" aria-hidden="true" />}
                </div>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button variant="secondary" className="h-9 px-3" onClick={() => openEditTemplate(kind, template)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Button>
                <Button variant="secondary" className="h-9 px-3 text-destructive" onClick={() => void deleteTemplate(kind, template)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded bg-line-faint px-2 py-1 text-xs font-bold text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span className="numeric">{"exercises" in template ? template.exercises.length : template.meals.length}</span>
                  {"exercises" in template ? " exercises" : " meals"}
                </span>
                {"exercises" in template ? (
                  <span className="inline-flex items-center gap-1.5 rounded bg-line-faint px-2 py-1 text-xs font-bold text-muted-foreground">
                    <Timer className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    <span className="numeric">{template.exercises.length * 8}</span> min est.
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                {"exercises" in template
                  ? template.exercises.map((exercise, index) => (
                      <div key={`${template.id}-${index}`} className="flex justify-between gap-3">
                        <span>{exercise.name}</span>
                        <span className="numeric font-semibold">{exercise.sets} x {exercise.reps}</span>
                      </div>
                    ))
                  : template.meals.map((meal, index) => (
                      <div key={`${template.id}-${index}`} className="flex justify-between gap-3">
                        <span>{meal.name}</span>
                        <span className="numeric font-semibold">{meal.calories} cal</span>
                      </div>
                    ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <TemplateModal kind={templateOpen} template={editingTemplate} onClose={() => setTemplateOpen(null)} onSaved={() => void load()} />
      <AssignModal
        kind={assignOpen}
        templates={assignOpen === "workout" ? workouts : diets}
        trainerProfiles={profiles.filter((profile) => profile.role === "TRAINER")}
        canPickTrainer={canPickTrainer}
        ownTrainerId={ownTrainerProfile?.id ?? null}
        onClose={() => setAssignOpen(null)}
      />
    </section>
  );
}

function TemplateModal({
  kind,
  template,
  onClose,
  onSaved
}: {
  kind: TemplateKind | null;
  template: EditableTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<WorkoutExerciseDto[]>([{ name: "", sets: 3, reps: 10 }]);
  const [meals, setMeals] = useState<DietMealDto[]>([{ name: "", calories: 350, proteinGrams: 20, carbsGrams: 35, fatGrams: 10 }]);

  useEffect(() => {
    if (!kind) {
      return;
    }
    setName(template?.name ?? "");
    if (kind === "workout") {
      setExercises(template && "exercises" in template ? template.exercises : [{ name: "", sets: 3, reps: 10 }]);
    } else {
      setMeals(template && "meals" in template ? template.meals : [{ name: "", calories: 350, proteinGrams: 20, carbsGrams: 35, fatGrams: 10 }]);
    }
  }, [kind, template]);

  const submit = async (): Promise<void> => {
    if (!kind) return;
    try {
      if (kind === "workout") {
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
      toast.success(template?.id ? "Template updated" : "Template created");
      onClose();
      onSaved();
      setName("");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not save template"));
    }
  };

  return (
    <Modal title={`${template?.id ? "Edit" : "New"} ${kind ?? ""} Template`} open={!!kind} onClose={onClose}>
      <div className="grid gap-3">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        {kind === "workout" ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-foreground">Exercises</p>
              <Button variant="secondary" className="h-9 px-3" onClick={() => setExercises((current) => [...current, { name: "", sets: 3, reps: 10 }])}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>
            {exercises.map((exercise, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border bg-background p-2 sm:grid-cols-[minmax(0,1fr)_80px_80px_36px]">
                <Input label="Exercise" value={exercise.name} onChange={(event) => updateExercise(index, { name: event.target.value }, setExercises)} />
                <Input label="Sets" type="number" value={exercise.sets} onChange={(event) => updateExercise(index, { sets: Number(event.target.value) }, setExercises)} />
                <Input label="Reps" type="number" value={exercise.reps} onChange={(event) => updateExercise(index, { reps: Number(event.target.value) }, setExercises)} />
                <Button variant="secondary" className="mt-7 h-9 w-9 px-0 text-destructive" onClick={() => setExercises((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-foreground">Meals</p>
              <Button variant="secondary" className="h-9 px-3" onClick={() => setMeals((current) => [...current, { name: "", calories: 350, proteinGrams: 20, carbsGrams: 35, fatGrams: 10 }])}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </div>
            {meals.map((meal, index) => (
              <div key={index} className="grid gap-2 rounded-md border border-border bg-background p-2 sm:grid-cols-[minmax(0,1fr)_80px_80px_80px_80px_36px]">
                <Input label="Meal" value={meal.name} onChange={(event) => updateMeal(index, { name: event.target.value }, setMeals)} />
                <Input label="Cal" type="number" value={meal.calories} onChange={(event) => updateMeal(index, { calories: Number(event.target.value) }, setMeals)} />
                <Input label="Protein" type="number" value={meal.proteinGrams} onChange={(event) => updateMeal(index, { proteinGrams: Number(event.target.value) }, setMeals)} />
                <Input label="Carbs" type="number" value={meal.carbsGrams} onChange={(event) => updateMeal(index, { carbsGrams: Number(event.target.value) }, setMeals)} />
                <Input label="Fat" type="number" value={meal.fatGrams} onChange={(event) => updateMeal(index, { fatGrams: Number(event.target.value) }, setMeals)} />
                <Button variant="secondary" className="mt-7 h-9 w-9 px-0 text-destructive" onClick={() => setMeals((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <Button onClick={() => void submit()}>{template?.id ? "Save Template" : "Create Template"}</Button>
      </div>
    </Modal>
  );
}

function updateExercise(index: number, patch: Partial<WorkoutExerciseDto>, setter: (value: SetStateAction<WorkoutExerciseDto[]>) => void): void {
  setter((current) => current.map((exercise, itemIndex) => (itemIndex === index ? { ...exercise, ...patch } : exercise)));
}

function updateMeal(index: number, patch: Partial<DietMealDto>, setter: (value: SetStateAction<DietMealDto[]>) => void): void {
  setter((current) => current.map((meal, itemIndex) => (itemIndex === index ? { ...meal, ...patch } : meal)));
}

function AssignModal({
  kind,
  templates,
  trainerProfiles,
  canPickTrainer,
  ownTrainerId,
  onClose
}: {
  kind: TemplateKind | null;
  templates: Array<WorkoutPlanTemplateDto | DietPlanTemplateDto>;
  trainerProfiles: StaffProfileDto[];
  canPickTrainer: boolean;
  ownTrainerId: string | null;
  onClose: () => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<MemberDto[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (kind) {
      setTemplateId(templates[0]?.id ?? "");
      setTrainerId("");
      setMemberId("");
      setMemberSearch("");
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
    const timer = window.setTimeout(() => {
      void memberApi
        .listMembers({ page: 1, pageSize: 8, search: query })
        .then((response) => setMemberResults(response.data))
        .catch((error) => toast.error(getApiErrorMessage(error, "Could not search members")));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [memberSearch, selectedMember]);

  const submit = async (): Promise<void> => {
    if (!kind) return;
    const payload = {
      memberId,
      templateId,
      startDate,
      ...((canPickTrainer || ownTrainerId) && trainerId ? { trainerId } : {})
    };
    try {
      if (kind === "workout") {
        await staffApi.assignWorkout(payload);
      } else {
        await staffApi.assignDiet(payload);
      }
      toast.success("Plan assigned");
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not assign plan"));
    }
  };

  return (
    <Modal title={`Assign ${kind ?? ""} Plan`} open={!!kind} onClose={onClose}>
      <div className="grid gap-3">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-foreground">
          <span>Search member</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              className="h-11 w-full rounded-md border border-border bg-surface/70 pl-9 pr-3 text-sm text-foreground outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25"
              placeholder="Name, member ID, phone, or email"
              value={memberSearch}
              onChange={(event) => {
                setMemberSearch(event.target.value);
                setSelectedMember(null);
                setMemberId("");
              }}
            />
          </div>
        </label>
        {selectedMember ? (
          <div className="flex items-center gap-3 rounded-md border border-brand/40 bg-line-faint p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background text-primary">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-foreground">{selectedMember.firstName} {selectedMember.lastName}</p>
              <p className="numeric truncate text-xs font-semibold text-muted-foreground">{selectedMember.memberCode} · {selectedMember.phone}</p>
            </div>
          </div>
        ) : null}
        {memberResults.length > 0 ? (
          <div className="max-h-60 overflow-y-auto rounded-md border border-border bg-background shadow-sm">
            {memberResults.map((member) => (
              <button
                key={member.id}
                type="button"
                className="flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left transition last:border-b-0 hover:bg-line-faint focus-visible:focus-ring"
                onClick={() => {
                  setSelectedMember(member);
                  setMemberId(member.id);
                  setMemberSearch(`${member.firstName} ${member.lastName}`);
                  setMemberResults([]);
                }}
              >
                <UserRound className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">{member.firstName} {member.lastName}</span>
                  <span className="numeric block truncate text-xs font-semibold text-muted-foreground">{member.memberCode} · {member.phone}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <label className="grid gap-2 text-sm font-medium text-foreground">
          <span>Template</span>
          <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </label>
        {canPickTrainer ? (
          <label className="grid gap-2 text-sm font-medium text-foreground">
            <span>Trainer optional</span>
            <select className="h-11 rounded-md border border-border bg-surface/70 px-3 outline-none transition hover:border-brand/50 focus:border-brand focus:ring-2 focus:ring-brand/25" value={trainerId} onChange={(event) => setTrainerId(event.target.value)}>
              <option value="">No trainer assigned</option>
              {trainerProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.userId}</option>)}
            </select>
          </label>
        ) : ownTrainerId ? (
          <p className="rounded-md bg-background p-3 text-sm font-semibold text-muted-foreground">Assigned as your trainer profile</p>
        ) : null}
        <Input label="Start date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        <Button onClick={() => void submit()} disabled={!memberId || !templateId}>Assign</Button>
      </div>
    </Modal>
  );
}
