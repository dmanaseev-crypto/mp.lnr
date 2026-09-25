import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  FolderKanban,
  Gauge,
  House,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Upload,
  UserRound,
  Users,
  X,
  Zap,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  Lightbulb,
  MapPin,
  Moon,
  Sun,
} from "lucide-react";
import logoUrl from "../Логотип.jpg";

type Role = "chair" | "member";
type ParticipantCategory = "parliament" | "municipal" | "reserve";
type Account = {
  name: string;
  username: string;
  role: Role;
  initials: string;
  category?: ParticipantCategory;
  municipality?: string;
};
type Page =
  | "home"
  | "tasks"
  | "chat"
  | "initiatives"
  | "opportunities"
  | "teams"
  | "projects"
  | "calendar"
  | "learning"
  | "awards"
  | "analytics"
  | "profile"
  | "admin";
type TaskStatus = "new" | "accepted" | "working" | "review" | "done";
type Priority = "Высокий" | "Средний" | "Обычный";

type Task = {
  id: number;
  title: string;
  description: string;
  assignee: string;
  municipality: string;
  project: string;
  direction: string;
  leader: string;
  dueAt: string;
  priority: Priority;
  status: TaskStatus;
  resultFormat: string;
  criteria: string;
  result?: string;
  reviewComment?: string;
  xp: number;
};

type Notice = {
  id: number;
  title: string;
  detail: string;
  read: boolean;
  kind: "task" | "message" | "award";
};

type InitiativeStatus = "idea" | "review" | "active" | "done";
type Initiative = {
  id: number;
  title: string;
  description: string;
  author: string;
  municipality: string;
  direction: string;
  impact: string;
  status: InitiativeStatus;
  votes: string[];
  createdAt: string;
};

type OpportunityCategory = "Стажировка" | "Обучение" | "Конкурс" | "Волонтёрство" | "Грант";
type Opportunity = {
  id: number;
  title: string;
  organizer: string;
  description: string;
  category: OpportunityCategory;
  format: string;
  location: string;
  deadline: string;
  seats: number;
  skills: string[];
  savedBy: string[];
  applications: { username: string; motivation: string; createdAt: string }[];
};

const CHAIR_NAME = "Председатель парламента";
const MEMBER_NAME = "Участник 01";
const participantCategories: { id: ParticipantCategory; label: string }[] = [
  { id: "parliament", label: "Член Молодёжного парламента" },
  { id: "municipal", label: "Член муниципальной палаты" },
  { id: "reserve", label: "Резервист Молодёжного парламента" },
];
const municipalities = [
  "город Алчевск",
  "город Брянка",
  "город Кировск",
  "город Красный Луч",
  "город Лисичанск",
  "город Луганск",
  "город Первомайск",
  "город Ровеньки",
  "город Рубежное",
  "город Северодонецк",
  "город Стаханов",
  "Антрацитовский муниципальный округ",
  "Беловодский муниципальный округ",
  "Белокуракинский муниципальный округ",
  "Краснодонский муниципальный округ",
  "Кременской муниципальный округ",
  "Лутугинский муниципальный округ",
  "Марковский муниципальный округ",
  "Меловский муниципальный округ",
  "Новоайдарский муниципальный округ",
  "Новопсковский муниципальный округ",
  "Перевальский муниципальный округ",
  "Сватовский муниципальный округ",
  "Свердловский муниципальный округ",
  "Славяносербский муниципальный округ",
  "Станично-Луганский муниципальный округ",
  "Старобельский муниципальный округ",
  "Троицкий муниципальный округ",
];
const categoryLabel = (category?: ParticipantCategory) =>
  participantCategories.find((item) => item.id === (category || "parliament"))?.label || participantCategories[0].label;
const members = [
  CHAIR_NAME,
  ...Array.from(
    { length: 31 },
    (_, index) => `Участник ${String(index + 1).padStart(2, "0")}`,
  ),
];
const usernames = [
  "chair",
  ...Array.from(
    { length: 31 },
    (_, index) => `member${String(index + 1).padStart(2, "0")}`,
  ),
];
const accounts: Account[] = members.map((name, index) => ({
  name,
  username: usernames[index],
  role: name === CHAIR_NAME ? "chair" : "member",
  initials: name
    .split(" ")
    .map((part) => part[0])
    .join(""),
  category: index <= 20 ? "parliament" : index <= 26 ? "municipal" : "reserve",
  municipality: index > 20 && index <= 26 ? municipalities[index - 21] : "Луганская Народная Республика",
}));
const DEFAULT_PASSWORD = "parliament2026";
const PASSWORD_STORAGE_KEY = "mp-password-hashes-v2";
const REGISTERED_ACCOUNTS_KEY = "mp-registered-accounts-v1";
const statuses: { id: TaskStatus; label: string }[] = [
  { id: "new", label: "Новая" },
  { id: "accepted", label: "Принята" },
  { id: "working", label: "В работе" },
  { id: "review", label: "На проверке" },
  { id: "done", label: "Выполнена" },
];

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function loadPasswordHashes() {
  try {
    return JSON.parse(
      localStorage.getItem(PASSWORD_STORAGE_KEY) || "{}",
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

const initialTasks: Task[] = [
  {
    id: 104,
    title: "Предложения по муниципальному этапу",
    description:
      "Подготовить предложения по проведению муниципального этапа проекта «Знай свои права» и загрузить документ.",
    assignee: MEMBER_NAME,
    municipality: "Луганск",
    project: "Знай свои права",
    direction: "Правовое просвещение",
    leader: CHAIR_NAME,
    dueAt: hoursFromNow(52),
    priority: "Высокий",
    status: "working",
    resultFormat: "Документ DOCX или PDF",
    criteria: "Не менее 3 инициатив; указаны аудитория, сроки и ресурсы",
    xp: 150,
  },
  {
    id: 103,
    title: "Анализ обращений молодёжи",
    description: "Выделить пять наиболее частых тем обращений за август.",
    assignee: "Участник 02",
    municipality: "Алчевск",
    project: "Открытый диалог",
    direction: "Аналитика",
    leader: CHAIR_NAME,
    dueAt: hoursFromNow(5),
    priority: "Высокий",
    status: "review",
    resultFormat: "Аналитическая записка",
    criteria: "Выводы подтверждены данными",
    result: "Аналитика_обращений.pdf",
    xp: 150,
  },
  {
    id: 102,
    title: "Сценарий открытого диалога",
    description: "Подготовить тайминг и вопросы для встречи с активистами.",
    assignee: "Участник 03",
    municipality: "Краснодон",
    project: "Открытый диалог",
    direction: "Мероприятия",
    leader: CHAIR_NAME,
    dueAt: hoursFromNow(28),
    priority: "Средний",
    status: "accepted",
    resultFormat: "Документ",
    criteria: "Тайминг до 60 минут",
    xp: 75,
  },
  {
    id: 101,
    title: "Карта молодёжных инициатив",
    description: "Собрать инициативы муниципальной палаты за квартал.",
    assignee: "Участник 04",
    municipality: "Свердловск",
    project: "Точки роста",
    direction: "Проектное управление",
    leader: CHAIR_NAME,
    dueAt: hoursFromNow(-25),
    priority: "Средний",
    status: "working",
    resultFormat: "Таблица",
    criteria: "Указан статус каждой инициативы",
    xp: 100,
  },
  {
    id: 100,
    title: "Паспорт проектной идеи",
    description: "Заполнить шаблон проектной инициативы.",
    assignee: MEMBER_NAME,
    municipality: "Луганск",
    project: "Точки роста",
    direction: "Проектное управление",
    leader: CHAIR_NAME,
    dueAt: hoursFromNow(-48),
    priority: "Обычный",
    status: "done",
    resultFormat: "PDF",
    criteria: "Заполнены все разделы",
    result: "Паспорт_проекта.pdf",
    xp: 100,
  },
];

const nav: { id: Page; label: string; icon: typeof House }[] = [
  { id: "home", label: "Главная", icon: House },
  { id: "tasks", label: "Задачи", icon: CheckCircle2 },
  { id: "chat", label: "Коммуникация", icon: MessageSquare },
  { id: "initiatives", label: "Инициативы", icon: Lightbulb },
  { id: "opportunities", label: "Возможности", icon: BriefcaseBusiness },
  { id: "teams", label: "Команды", icon: Users },
  { id: "projects", label: "Проекты", icon: FolderKanban },
  { id: "calendar", label: "Календарь", icon: CalendarDays },
  { id: "learning", label: "Развитие", icon: BookOpen },
  { id: "awards", label: "Достижения", icon: Trophy },
  { id: "analytics", label: "Аналитика", icon: BarChart3 },
  { id: "profile", label: "Профиль", icon: UserRound },
];

const initiativeStatuses: { id: InitiativeStatus; label: string }[] = [
  { id: "idea", label: "Идея" },
  { id: "review", label: "На рассмотрении" },
  { id: "active", label: "В реализации" },
  { id: "done", label: "Реализовано" },
];

const initialInitiatives: Initiative[] = [
  {
    id: 3,
    title: "Молодёжная карта возможностей",
    description: "Единый каталог стажировок, конкурсов, волонтёрских и образовательных программ муниципалитетов.",
    author: "Участник 04",
    municipality: "Луганск",
    direction: "Образование и карьера",
    impact: "Высокий",
    status: "active",
    votes: ["member01", "member02", "member03", "chair"],
    createdAt: "2026-09-18",
  },
  {
    id: 2,
    title: "Школа общественного проектирования",
    description: "Практический курс, где молодые авторы превращают проблему муниципалитета в готовую инициативу.",
    author: "Участник 02",
    municipality: "Алчевск",
    direction: "Развитие и навыки",
    impact: "Высокий",
    status: "review",
    votes: ["member01", "member05", "member06"],
    createdAt: "2026-09-16",
  },
  {
    id: 1,
    title: "Добровольческий десант",
    description: "Система коротких волонтёрских смен с понятным результатом, наставником и подтверждением вклада.",
    author: "Участник 07",
    municipality: "Краснодон",
    direction: "Добровольчество",
    impact: "Средний",
    status: "idea",
    votes: ["member03"],
    createdAt: "2026-09-12",
  },
];

const initialOpportunities: Opportunity[] = [
  {
    id: 5,
    title: "Школа молодых управленцев",
    organizer: "Молодёжный парламент",
    description: "Практическая программа по проектному управлению, публичным коммуникациям и работе с командой.",
    category: "Обучение",
    format: "Очно + онлайн",
    location: "Луганск",
    deadline: hoursFromNow(240),
    seats: 30,
    skills: ["Лидерство", "Проекты", "Коммуникации"],
    savedBy: ["member01"],
    applications: [],
  },
  {
    id: 4,
    title: "Стажировка в проектном офисе",
    organizer: "Региональный проектный офис",
    description: "Работа с реальными общественными проектами под руководством наставника в течение шести недель.",
    category: "Стажировка",
    format: "Очно",
    location: "Луганск",
    deadline: hoursFromNow(144),
    seats: 12,
    skills: ["Аналитика", "Документы", "Команда"],
    savedBy: ["member02", "member03"],
    applications: [],
  },
  {
    id: 3,
    title: "Конкурс муниципальных инициатив",
    organizer: "Совет муниципалитетов",
    description: "Отбор решений для городской среды, молодёжного досуга и развития территорий с экспертной поддержкой.",
    category: "Конкурс",
    format: "Онлайн-отбор",
    location: "Вся Республика",
    deadline: hoursFromNow(360),
    seats: 50,
    skills: ["Проектирование", "Презентация"],
    savedBy: [],
    applications: [],
  },
  {
    id: 2,
    title: "Волонтёрский корпус форума",
    organizer: "Ресурсный центр добровольчества",
    description: "Команда сопровождения молодёжного форума: регистрация, навигация участников и медиаподдержка.",
    category: "Волонтёрство",
    format: "Очно",
    location: "Алчевск",
    deadline: hoursFromNow(96),
    seats: 40,
    skills: ["События", "Сервис", "Медиа"],
    savedBy: ["member01", "member04"],
    applications: [],
  },
  {
    id: 1,
    title: "Мини-гранты «Точка действия»",
    organizer: "Фонд молодёжных проектов",
    description: "Финансовая и методическая поддержка локальных инициатив с бюджетом до 150 000 рублей.",
    category: "Грант",
    format: "Проектная заявка",
    location: "Вся Республика",
    deadline: hoursFromNow(480),
    seats: 20,
    skills: ["Бюджет", "Заявка", "Социальный эффект"],
    savedBy: ["member05"],
    applications: [],
  },
];

function countdown(dueAt: string, done = false) {
  if (done) return "Завершено";
  const hours = Math.round(
    (new Date(dueAt).getTime() - Date.now()) / 3_600_000,
  );
  if (hours < 0)
    return `Просрочено на ${Math.max(1, Math.floor(Math.abs(hours) / 24))} дн.`;
  if (hours < 24) return `Осталось ${hours} ч.`;
  return `Осталось ${Math.floor(hours / 24)} дн. ${hours % 24} ч.`;
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [page, setPage] = useState<Page>("home");
  const [currentAccount, setCurrentAccount] = useState<Account>(
    accounts.find((account) => account.role === "chair")!,
  );
  const [passwordHashes, setPasswordHashes] =
    useState<Record<string, string>>(loadPasswordHashes);
  const [registeredAccounts, setRegisteredAccounts] = useState<Account[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(REGISTERED_ACCOUNTS_KEY) || "[]") as Account[];
    } catch {
      return [];
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("mp-tasks-v3");
    return saved ? JSON.parse(saved) : initialTasks;
  });
  const [initiatives, setInitiatives] = useState<Initiative[]>(() => {
    const saved = localStorage.getItem("mp-initiatives-v1");
    return saved ? JSON.parse(saved) : initialInitiatives;
  });
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
    const saved = localStorage.getItem("mp-opportunities-v1");
    return saved ? JSON.parse(saved) : initialOpportunities;
  });
  const [notices, setNotices] = useState<Notice[]>([
    {
      id: 1,
      title: "Результат ожидает проверки",
      detail: "Участник загрузил аналитическую записку",
      read: false,
      kind: "task",
    },
    {
      id: 2,
      title: "Вас упомянули",
      detail: "Команда проекта «Открытый диалог»",
      read: false,
      kind: "message",
    },
    {
      id: 3,
      title: "Новое достижение",
      detail: "Серия: 5 задач выполнено вовремя",
      read: true,
      kind: "award",
    },
  ]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [xp, setXp] = useState(1280);

  useEffect(
    () => localStorage.setItem("mp-tasks-v3", JSON.stringify(tasks)),
    [tasks],
  );
  useEffect(
    () => localStorage.setItem("mp-initiatives-v1", JSON.stringify(initiatives)),
    [initiatives],
  );
  useEffect(
    () => localStorage.setItem("mp-opportunities-v1", JSON.stringify(opportunities)),
    [opportunities],
  );
  useEffect(
    () =>
      localStorage.setItem(PASSWORD_STORAGE_KEY, JSON.stringify(passwordHashes)),
    [passwordHashes],
  );
  useEffect(
    () => localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(registeredAccounts)),
    [registeredAccounts],
  );
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const stats = useMemo(
    () => ({
      done: tasks.filter((task) => task.status === "done").length,
      working: tasks.filter((task) =>
        ["accepted", "working"].includes(task.status),
      ).length,
      review: tasks.filter((task) => task.status === "review").length,
      overdue: tasks.filter(
        (task) =>
          task.status !== "done" && new Date(task.dueAt).getTime() < Date.now(),
      ).length,
    }),
    [tasks],
  );

  const updateTask = (id: number, patch: Partial<Task>, message?: string) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
    setSelectedTask((current) =>
      current?.id === id ? { ...current, ...patch } : current,
    );
    if (message) setToast(message);
  };

  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const task: Task = {
      id: Math.max(...tasks.map((item) => item.id), 0) + 1,
      title: String(data.get("title")),
      description: String(data.get("description")),
      assignee: String(data.get("assignee")),
      municipality: String(data.get("municipality")),
      project: String(data.get("project")),
      direction: String(data.get("direction")),
      leader: CHAIR_NAME,
      dueAt: new Date(String(data.get("dueAt"))).toISOString(),
      priority: String(data.get("priority")) as Priority,
      status: "new",
      resultFormat: String(data.get("resultFormat")),
      criteria: String(data.get("criteria")),
      xp: 100,
    };
    setTasks((current) => [task, ...current]);
    setNotices((current) => [
      {
        id: Date.now(),
        title: "Назначена новая задача",
        detail: `${task.assignee}: ${task.title}`,
        read: false,
        kind: "task",
      },
      ...current,
    ]);
    setCreateOpen(false);
    setToast(`Задача назначена: ${task.assignee}`);
    setPage("tasks");
  };

  const createInitiative = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const initiative: Initiative = {
      id: Math.max(...initiatives.map((item) => item.id), 0) + 1,
      title: String(data.get("title")),
      description: String(data.get("description")),
      author: currentAccount.name,
      municipality: String(data.get("municipality")),
      direction: String(data.get("direction")),
      impact: String(data.get("impact")),
      status: "idea",
      votes: [currentAccount.username],
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setInitiatives((current) => [initiative, ...current]);
    setNotices((current) => [
      {
        id: Date.now(),
        title: "Новая молодёжная инициатива",
        detail: `${initiative.title} · ${initiative.municipality}`,
        read: false,
        kind: "message",
      },
      ...current,
    ]);
    setToast("Инициатива добавлена в банк идей");
    setPage("initiatives");
  };

  const voteForInitiative = (id: number) => {
    setInitiatives((current) =>
      current.map((initiative) => {
        if (initiative.id !== id) return initiative;
        const hasVoted = initiative.votes.includes(currentAccount.username);
        return {
          ...initiative,
          votes: hasVoted
            ? initiative.votes.filter((username) => username !== currentAccount.username)
            : [...initiative.votes, currentAccount.username],
        };
      }),
    );
  };

  const advanceInitiative = (id: number) => {
    setInitiatives((current) =>
      current.map((initiative) => {
        if (initiative.id !== id) return initiative;
        const index = initiativeStatuses.findIndex((item) => item.id === initiative.status);
        const next = initiativeStatuses[Math.min(index + 1, initiativeStatuses.length - 1)].id;
        return { ...initiative, status: next };
      }),
    );
    setToast("Статус инициативы обновлён");
  };

  const toggleSavedOpportunity = (id: number) => {
    setOpportunities((current) =>
      current.map((opportunity) => {
        if (opportunity.id !== id) return opportunity;
        const isSaved = opportunity.savedBy.includes(currentAccount.username);
        return {
          ...opportunity,
          savedBy: isSaved
            ? opportunity.savedBy.filter((username) => username !== currentAccount.username)
            : [...opportunity.savedBy, currentAccount.username],
        };
      }),
    );
  };

  const applyToOpportunity = (id: number, motivation: string) => {
    setOpportunities((current) =>
      current.map((opportunity) => {
        if (opportunity.id !== id || opportunity.applications.some((item) => item.username === currentAccount.username)) {
          return opportunity;
        }
        return {
          ...opportunity,
          applications: [
            ...opportunity.applications,
            { username: currentAccount.username, motivation, createdAt: new Date().toISOString() },
          ],
        };
      }),
    );
    setNotices((current) => [
      { id: Date.now(), title: "Заявка отправлена", detail: "Организатор рассмотрит отклик и свяжется с вами", read: false, kind: "message" },
      ...current,
    ]);
    setToast("Заявка на возможность отправлена");
  };

  const submitResult = (task: Task) => {
    updateTask(
      task.id,
      { status: "review", result: "Предложения_муниципальный_этап.pdf" },
      "Результат направлен руководителю",
    );
    setNotices((current) => [
      {
        id: Date.now(),
        title: "Новый результат на проверке",
        detail: task.title,
        read: false,
        kind: "task",
      },
      ...current,
    ]);
  };

  const acceptResult = (task: Task) => {
    updateTask(
      task.id,
      { status: "done", reviewComment: "Результат принят" },
      `Результат принят · +${task.xp} XP`,
    );
    setXp((current) => current + task.xp);
  };

  const role = currentAccount.role;
  const availableAccounts = [...accounts, ...registeredAccounts];
  const currentUser = {
    name: currentAccount.name,
    username: currentAccount.username,
    role: role === "chair" ? "Председатель" : categoryLabel(currentAccount.category),
    initials: currentAccount.initials,
    category: currentAccount.category || "parliament" as ParticipantCategory,
    municipality: currentAccount.municipality || "Луганская Народная Республика",
  };

  const authenticate = async (username: string, password: string) => {
    const account = availableAccounts.find(
      (item) => item.username.toLowerCase() === username.toLowerCase(),
    );
    if (!account) return "Учётная запись не найдена";
    const enteredHash = await hashPassword(password);
    const expectedHash =
      passwordHashes[account.username] || (await hashPassword(DEFAULT_PASSWORD));
    if (enteredHash !== expectedHash) return "Неверный пароль";
    setCurrentAccount(account);
    setAuthenticated(true);
    setPage("home");
    return null;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const currentHash = await hashPassword(currentPassword);
    const expectedHash =
      passwordHashes[currentAccount.username] ||
      (await hashPassword(DEFAULT_PASSWORD));
    if (currentHash !== expectedHash) return "Текущий пароль указан неверно";
    if (newPassword.length < 8)
      return "Новый пароль должен содержать не менее 8 символов";
    const newHash = await hashPassword(newPassword);
    setPasswordHashes((current) => ({
      ...current,
      [currentAccount.username]: newHash,
    }));
    setToast("Пароль успешно изменён");
    return null;
  };

  if (!authenticated) {
    return (
      <LoginScreen
        theme={theme}
        onTheme={() =>
          setTheme((value) => (value === "dark" ? "light" : "dark"))
        }
        onLogin={authenticate}
        accounts={availableAccounts}
        onRegister={async (name, username, password, category, municipality) => {
          const normalizedUsername = username.trim().toLowerCase();
          if (name.trim().length < 3) return "Укажите имя и фамилию";
          if (!/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)) {
            return "Логин: 3–24 символа, только латиница, цифры, точка, _ или -";
          }
          if (availableAccounts.some((item) => item.username === normalizedUsername)) {
            return "Такой логин уже занят";
          }
          if (password.length < 8) return "Пароль должен содержать не менее 8 символов";
          const account: Account = {
            name: name.trim(),
            username: normalizedUsername,
            role: "member",
            initials: name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase(),
            category,
            municipality: category === "municipal" ? municipality : "Луганская Народная Республика",
          };
          const passwordHash = await hashPassword(password);
          setRegisteredAccounts((current) => [...current, account]);
          setPasswordHashes((current) => ({ ...current, [normalizedUsername]: passwordHash }));
          setCurrentAccount(account);
          setAuthenticated(true);
          setPage("home");
          return null;
        }}
      />
    );
  }

  return (
    <div
      className={`app theme-${theme} ${sidebarOpen ? "" : "sidebar-collapsed"}`}
    >
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src={logoUrl} alt="Молодёжный парламент" />
          </div>
          <div className="brand-copy">
            <strong>МП.ШТАБ</strong>
            <span>Цифровая экосистема</span>
          </div>
        </div>
        <nav>
          <span className="nav-caption">Рабочее пространство</span>
          {nav.map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => setPage(item.id)}
              title={item.label}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "chat" && <i>4</i>}
            </button>
          ))}
          {role === "chair" && (
            <>
              <span className="nav-caption management">Администрирование</span>
              <button
                className={page === "admin" ? "active" : ""}
                onClick={() => setPage("admin")}
              >
                <Settings size={19} />
                <span>Управление</span>
              </button>
            </>
          )}
        </nav>
        <div className="level-card">
          <div>
            <Sparkles size={15} />
            <span>Уровень 6</span>
            <b>{xp} XP</b>
          </div>
          <strong>{role === "chair" ? "Управленец" : "Активист"}</strong>
          <div className="progress">
            <span style={{ width: `${Math.min(92, (xp % 1500) / 15)}%` }} />
          </div>
          <small>До следующего уровня: {Math.max(0, 1500 - xp)} XP</small>
        </div>
        <button
          className="collapse"
          onClick={() => setSidebarOpen((value) => !value)}
        >
          <Menu size={18} />
          <span>Свернуть меню</span>
        </button>
      </aside>

      <main>
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <Menu />
          </button>
          <button className="search" onClick={() => setSearchOpen(true)}>
            <Search size={18} />
            <span>Поиск по штабу</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="top-actions">
            <button
              className="icon-button"
              title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
              onClick={() =>
                setTheme((value) => (value === "dark" ? "light" : "dark"))
              }
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button"
              onClick={() => setNoticeOpen((value) => !value)}
            >
              <Bell size={19} />
              <i>{notices.filter((item) => !item.read).length}</i>
            </button>
            <div className="role-wrap">
              <button
                className="user-switch"
                onClick={() => setRoleOpen((value) => !value)}
              >
                <span className="avatar">{currentUser.initials}</span>
                <span>
                  <strong>{currentUser.name}</strong>
                  <small>{currentUser.role}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {roleOpen && (
                <div className="role-menu">
                  <small>Учётная запись</small>
                  <button
                    onClick={() => {
                      setPage("profile");
                      setRoleOpen(false);
                    }}
                  >
                    <UserRound size={15} />
                    Профиль и пароль
                  </button>
                  <div className="menu-divider" />
                  <button
                    className="logout"
                    onClick={() => {
                      setAuthenticated(false);
                      setRoleOpen(false);
                    }}
                  >
                    <LogOut size={15} />
                    Выйти из системы
                  </button>
                </div>
              )}
            </div>
          </div>
          {noticeOpen && (
            <Notifications
              notices={notices}
              onRead={() =>
                setNotices((items) =>
                  items.map((item) => ({ ...item, read: true })),
                )
              }
            />
          )}
        </header>

        <section className="content">
          {page === "home" && (
            <Dashboard
              role={role}
              userName={currentAccount.name}
              tasks={tasks}
              stats={stats}
              onTask={setSelectedTask}
              onCreate={() => setCreateOpen(true)}
              onNavigate={setPage}
            />
          )}
          {page === "tasks" && (
            <TasksPage
              role={role}
              userName={currentAccount.name}
              tasks={tasks}
              onTask={setSelectedTask}
              onCreate={() => setCreateOpen(true)}
              onMove={(id, status) =>
                updateTask(id, { status }, "Статус задачи обновлён")
              }
            />
          )}
          {page === "chat" && (
            <Communication onTask={() => setCreateOpen(true)} />
          )}
          {page === "initiatives" && (
            <InitiativesPage
              initiatives={initiatives}
              currentUsername={currentAccount.username}
              currentName={currentAccount.name}
              isChair={role === "chair"}
              onCreate={() => setInitiativeOpen(true)}
              onVote={voteForInitiative}
              onAdvance={advanceInitiative}
            />
          )}
          {page === "opportunities" && (
            <OpportunitiesPage
              opportunities={opportunities}
              username={currentAccount.username}
              onSave={toggleSavedOpportunity}
              onApply={applyToOpportunity}
            />
          )}
          {page === "teams" && <TeamsPage accounts={availableAccounts} />}
          {page === "projects" && <ProjectsPage />}
          {page === "calendar" && <CalendarPage tasks={tasks} />}
          {page === "learning" && <LearningPage />}
          {page === "awards" && <AwardsPage />}
          {page === "analytics" && <AnalyticsPage stats={stats} />}
          {page === "profile" && (
            <ProfilePage
              user={currentUser}
              xp={xp}
              onChangePassword={changePassword}
            />
          )}
          {page === "admin" && role === "chair" && (
            <AdminPage stats={stats} onNavigate={setPage} />
          )}
        </section>
      </main>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          role={role}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onSubmit={submitResult}
          onAccept={acceptResult}
        />
      )}
      {createOpen && (
        <CreateTask
          onClose={() => setCreateOpen(false)}
          onSubmit={createTask}
        />
      )}
      {initiativeOpen && (
        <CreateInitiative
          onClose={() => setInitiativeOpen(false)}
          onSubmit={createInitiative}
        />
      )}
      {searchOpen && (
        <SearchDialog
          tasks={tasks}
          onClose={() => setSearchOpen(false)}
          onTask={(task) => {
            setSelectedTask(task);
            setSearchOpen(false);
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </div>
  );
}

function LoginScreen({
  theme,
  onTheme,
  onLogin,
  accounts: availableAccounts,
  onRegister,
}: {
  theme: "dark" | "light";
  onTheme: () => void;
  onLogin: (username: string, password: string) => Promise<string | null>;
  accounts: Account[];
  onRegister: (name: string, username: string, password: string, category: ParticipantCategory, municipality: string) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("chair");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ParticipantCategory>("parliament");
  const [municipality, setMunicipality] = useState(municipalities[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedAccount = availableAccounts.find(
    (account) => account.username === username,
  ) || availableAccounts[0];
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    if (mode === "register" && data.get("password") !== data.get("confirmPassword")) {
      setError("Пароли не совпадают");
      setLoading(false);
      return;
    }
    const loginError = mode === "login"
      ? await onLogin(username, String(data.get("password")))
      : await onRegister(name, username, String(data.get("password")), category, municipality);
    setError(loginError || "");
    setLoading(false);
  };
  return (
    <div className={`login-screen theme-${theme}`}>
      <div className="login-atmosphere">
        <span />
        <span />
        <span />
      </div>
      <button
        className="login-theme"
        onClick={onTheme}
        title="Переключить тему"
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </button>
      <section className="login-brand">
        <div className="official-logo">
          <img
            src={logoUrl}
            alt="Молодёжный парламент при Народном Совете ЛНР"
          />
        </div>
        <span className="login-kicker">Единая цифровая среда</span>
        <h1>
          Управлять.
          <br />
          Развиваться.
          <br />
          <em>Действовать.</em>
        </h1>
        <p>
          Цифровой штаб для прозрачной командной работы и развития молодых
          управленцев.
        </p>
        <div className="login-facts">
          <span>
            <ShieldCheck />
            Защищённый контур
          </span>
          <span>
            <Activity />
            Работа на результат
          </span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <span className="eyebrow">МП.Штаб · Доступ к системе</span>
          <div className="login-mode-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setUsername("chair"); setError(""); }}>Войти</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setUsername(""); setError(""); }}>Регистрация</button></div>
          <h2>{mode === "login" ? "Вход в пространство" : "Создать аккаунт"}</h2>
          <p>{mode === "login" ? "Выберите свою учётную запись и введите пароль." : "Зарегистрируйтесь как участник молодёжной экосистемы."}</p>
          {mode === "login" && <div className="selected-account">
            <span>{selectedAccount.initials}</span>
            <div>
              <strong>{selectedAccount.name}</strong>
              <small>
                {selectedAccount.role === "chair" ? "Председатель" : categoryLabel(selectedAccount.category)}
              </small>
            </div>
            {selectedAccount.role === "chair" && <ShieldCheck />}
          </div>}
          <form onSubmit={submit}>
            {mode === "register" && <label>Имя и фамилия<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Иван Иванов" required minLength={3} /></label>}
            {mode === "register" && <label>Категория участника<div><Users /><select value={category} onChange={(event) => setCategory(event.target.value as ParticipantCategory)}>{participantCategories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div></label>}
            {mode === "register" && category === "municipal" && <label>Муниципальная палата<div><MapPin /><select value={municipality} onChange={(event) => setMunicipality(event.target.value)}>{municipalities.map((item) => <option key={item}>{item}</option>)}</select></div></label>}
            <label>
              Учётная запись
              <div>
                <UserRound />
                {mode === "login" ? <select
                  value={username}
                  onChange={(event) => { setUsername(event.target.value); setError(""); }}
                >
                  {availableAccounts.map((account) => (
                    <option key={account.username} value={account.username}>
                      {account.name} · {account.username}
                    </option>
                  ))}
                </select> : <input value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} placeholder="ivan.ivanov" required minLength={3} />}
              </div>
            </label>
            <label>
              Пароль
              <div>
                <LockKeyhole />
                <input
                  key={mode}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  defaultValue={mode === "login" ? "parliament2026" : ""}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </label>
            {mode === "register" && <label>Повторите пароль<div><LockKeyhole /><input type={showPassword ? "text" : "password"} name="confirmPassword" minLength={8} required /></div></label>}
            {error && <div className="login-error"><CircleAlert />{error}</div>}
            {mode === "login" && <div className="login-options">
              <label>
                <input type="checkbox" defaultChecked />
                Запомнить на этом устройстве
              </label>
              <button type="button">Не получается войти?</button>
            </div>}
            <button className="login-submit" disabled={loading}>
              {loading ? (
                <span className="spinner" />
              ) : (
                <>
                  <span>{mode === "login" ? "Войти в штаб" : "Зарегистрироваться"}</span>
                  <ChevronRight />
                </>
              )}
            </button>
          </form>
          <small className="demo-note">
            <CircleAlert />
            {mode === "login" ? "Первичный пароль для демонстрационных аккаунтов: parliament2026" : "Новый аккаунт сохраняется на этом устройстве"}
          </small>
        </div>
        <footer>Версия 0.1 · Автономный контур организации</footer>
      </section>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}

function Dashboard({
  role,
  userName,
  tasks,
  stats,
  onTask,
  onCreate,
  onNavigate,
}: {
  role: Role;
  userName: string;
  tasks: Task[];
  stats: { done: number; working: number; review: number; overdue: number };
  onTask: (t: Task) => void;
  onCreate: () => void;
  onNavigate: (p: Page) => void;
}) {
  const typedStats = stats;
  const visible =
    role === "member"
      ? tasks.filter((task) => task.assignee === userName)
      : tasks;
  const completion = Math.round((typedStats.done / tasks.length) * 100);
  return (
    <>
      <PageTitle
        eyebrow="Вторник, 22 сентября"
        title={`Добрый день, ${userName.split(" ")[1]}`}
        text={
          role === "chair"
            ? "Ситуация в Молодёжном парламенте на текущий момент."
            : "Ваш фокус на сегодня: 3 задачи и одно мероприятие."
        }
        action={
          role === "chair" && (
            <button className="primary" onClick={onCreate}>
              <Plus size={18} />
              Создать задачу
            </button>
          )
        }
      />
      <div className="dashboard-grid">
        <section className="progress-hero">
          <div className="hero-glow" />
          <div className="hero-copy">
            <span className="eyebrow">
              <Activity size={15} />
              Текущий прогресс
            </span>
            <h2>
              {role === "chair"
                ? "Команда движется в хорошем темпе"
                : "Неделя проходит продуктивно"}
            </h2>
            <p>
              {completion || 72}% задач завершено. {typedStats.review} результат
              ожидает проверки.
            </p>
            <button onClick={() => onNavigate("analytics")}>
              Открыть аналитику <ChevronRight size={16} />
            </button>
          </div>
          <div
            className="progress-ring"
            style={
              { "--progress": `${completion || 72}%` } as React.CSSProperties
            }
          >
            <div>
              <strong>{completion || 72}%</strong>
              <span>выполнено</span>
            </div>
          </div>
        </section>
        <section className="today-card panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Мой день</span>
              <h3>В фокусе</h3>
            </div>
            <button>
              <MoreHorizontal />
            </button>
          </div>
          <div className="focus-list">
            <div>
              <span className="focus-icon violet">
                <CheckCircle2 />
              </span>
              <p>
                <strong>
                  {visible.filter((t) => t.status !== "done").length} задач
                </strong>
                <small>требуют действий</small>
              </p>
              <ChevronRight />
            </div>
            <div>
              <span className="focus-icon orange">
                <Clock3 />
              </span>
              <p>
                <strong>15:30 · ВКС</strong>
                <small>Совет руководителей проектов</small>
              </p>
              <ChevronRight />
            </div>
            <div>
              <span className="focus-icon blue">
                <MessageSquare />
              </span>
              <p>
                <strong>4 сообщения</strong>
                <small>2 упоминания</small>
              </p>
              <ChevronRight />
            </div>
          </div>
        </section>
      </div>
      <div className="stat-grid">
        <Stat
          tone="red"
          icon={CircleAlert}
          value={typedStats.overdue}
          label="Просрочено"
        />
        <Stat tone="orange" icon={Clock3} value="3" label="На сегодня" />
        <Stat
          tone="green"
          icon={CheckCircle2}
          value={typedStats.done + 14}
          label="Выполнено"
        />
        <Stat
          tone="blue"
          icon={Activity}
          value={typedStats.working}
          label="В работе"
        />
      </div>
      <div className="lower-grid">
        <section className="panel task-list">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Приоритет</span>
              <h3>
                {role === "chair" ? "Требует внимания" : "Ближайшие задачи"}
              </h3>
            </div>
            <button className="text-button" onClick={() => onNavigate("tasks")}>
              Все задачи <ChevronRight size={15} />
            </button>
          </div>
          {visible
            .filter((t) => t.status !== "done")
            .slice(0, 4)
            .map((task) => (
              <TaskRow key={task.id} task={task} onClick={() => onTask(task)} />
            ))}
        </section>
        <section className="panel project-card">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Активный проект</span>
              <h3>Знай свои права</h3>
            </div>
            <span className="project-symbol">
              <ShieldCheck />
            </span>
          </div>
          <p>Правовое просвещение молодёжи в муниципалитетах Республики.</p>
          <div className="project-progress">
            <div>
              <span>Общий прогресс</span>
              <strong>64%</strong>
            </div>
            <div className="progress">
              <span style={{ width: "64%" }} />
            </div>
          </div>
          <div className="avatar-stack">
            <span>ДМ</span>
            <span>СА</span>
            <span>ДБ</span>
            <span>+8</span>
          </div>
          <button className="secondary" onClick={() => onNavigate("projects")}>
            Открыть проект
          </button>
        </section>
      </div>
    </>
  );
}

function Stat({
  tone,
  icon: Icon,
  value,
  label,
}: {
  tone: string;
  icon: typeof Activity;
  value: number | string;
  label: string;
}) {
  return (
    <div className={`stat ${tone}`}>
      <span>
        <Icon />
      </span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
      <em>за неделю +2</em>
    </div>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const late =
    task.status !== "done" && new Date(task.dueAt).getTime() < Date.now();
  return (
    <button className="task-row" onClick={onClick}>
      <span className={`priority-dot ${task.priority.toLowerCase()}`} />
      <div>
        <strong>{task.title}</strong>
        <small>
          {task.assignee} · {task.project}
        </small>
      </div>
      <span className={`deadline ${late ? "late" : ""}`}>
        <Clock3 size={14} />
        {countdown(task.dueAt, task.status === "done")}
      </span>
      <span className={`status s-${task.status}`}>
        {statuses.find((s) => s.id === task.status)?.label}
      </span>
      <ChevronRight size={17} />
    </button>
  );
}

function TasksPage({
  role,
  userName,
  tasks,
  onTask,
  onCreate,
  onMove,
}: {
  role: Role;
  userName: string;
  tasks: Task[];
  onTask: (t: Task) => void;
  onCreate: () => void;
  onMove: (id: number, status: TaskStatus) => void;
}) {
  const [view, setView] = useState("Все задачи");
  const visible =
    role === "member" ? tasks.filter((t) => t.assignee === userName) : tasks;
  return (
    <>
      <PageTitle
        eyebrow="Контур исполнения"
        title="Задачи"
        text="Поручения, сроки и результаты в одном рабочем пространстве."
        action={
          role === "chair" && (
            <button className="primary" onClick={onCreate}>
              <Plus size={18} />
              Создать задачу
            </button>
          )
        }
      />
      <div className="toolbar">
        <div className="tabs">
          {[
            "Мои задачи",
            "Задачи команды",
            "Муниципалитет",
            "Проект",
            "Все задачи",
          ].map((item) => (
            <button
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <button className="filter">
          <Gauge size={17} />
          Фильтры
        </button>
      </div>
      <div className="kanban">
        {statuses.map((column) => (
          <section
            className="kanban-column"
            key={column.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) =>
              onMove(Number(event.dataTransfer.getData("taskId")), column.id)
            }
          >
            <header>
              <span className={`column-dot s-${column.id}`} />
              <strong>{column.label}</strong>
              <i>{visible.filter((t) => t.status === column.id).length}</i>
              <MoreHorizontal size={17} />
            </header>
            <div>
              {visible
                .filter((t) => t.status === column.id)
                .map((task) => (
                  <button
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("taskId", String(task.id))
                    }
                    className="task-card"
                    key={task.id}
                    onClick={() => onTask(task)}
                  >
                    <div>
                      <span
                        className={`priority-label ${task.priority.toLowerCase()}`}
                      >
                        {task.priority}
                      </span>
                      <MoreHorizontal size={16} />
                    </div>
                    <h4>{task.title}</h4>
                    <p>{task.project}</p>
                    <div
                      className={`card-deadline ${new Date(task.dueAt).getTime() < Date.now() && task.status !== "done" ? "late" : ""}`}
                    >
                      <Clock3 size={14} />
                      {countdown(task.dueAt, task.status === "done")}
                    </div>
                    <footer>
                      <span className="mini-avatar">
                        {task.assignee
                          .split(" ")
                          .map((x) => x[0])
                          .join("")}
                      </span>
                      <span>
                        <Paperclip size={14} />2
                      </span>
                    </footer>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function TaskDrawer({
  task,
  role,
  onClose,
  onUpdate,
  onSubmit,
  onAccept,
}: {
  task: Task;
  role: Role;
  onClose: () => void;
  onUpdate: (id: number, patch: Partial<Task>, message?: string) => void;
  onSubmit: (t: Task) => void;
  onAccept: (t: Task) => void;
}) {
  return (
    <div
      className="overlay drawer-overlay"
      onMouseDown={(e) => e.currentTarget === e.target && onClose()}
    >
      <aside className="drawer">
        <header>
          <div>
            <span className={`priority-label ${task.priority.toLowerCase()}`}>
              {task.priority} приоритет
            </span>
            <small>Задача #{task.id}</small>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <h2>{task.title}</h2>
        <div className="task-meta">
          <div>
            <UserRound />
            <span>
              Исполнитель<strong>{task.assignee}</strong>
            </span>
          </div>
          <div>
            <Clock3 />
            <span>
              Дедлайн
              <strong>
                {new Date(task.dueAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </span>
          </div>
          <div>
            <FolderKanban />
            <span>
              Проект<strong>{task.project}</strong>
            </span>
          </div>
          <div>
            <Activity />
            <span>
              Статус
              <strong>
                {statuses.find((s) => s.id === task.status)?.label}
              </strong>
            </span>
          </div>
        </div>
        <div
          className={`big-deadline ${new Date(task.dueAt).getTime() < Date.now() && task.status !== "done" ? "late" : ""}`}
        >
          <Clock3 />
          <div>
            <small>До контрольного срока</small>
            <strong>{countdown(task.dueAt, task.status === "done")}</strong>
          </div>
        </div>
        <article>
          <h4>Поручение</h4>
          <p>{task.description}</p>
          <h4>Критерии результата</h4>
          <ul>
            {task.criteria.split(";").map((item) => (
              <li key={item}>
                <Check size={15} />
                {item}
              </li>
            ))}
          </ul>
          <h4>Формат результата</h4>
          <p>
            <FileText size={16} />
            {task.resultFormat}
          </p>
        </article>
        {task.result && (
          <div className="result-file">
            <FileText />
            <span>
              <strong>{task.result}</strong>
              <small>PDF · 1,8 МБ</small>
            </span>
            <button>Открыть</button>
          </div>
        )}
        {task.reviewComment && (
          <div className="review-comment">
            <MessageSquare />
            <p>
              <strong>Комментарий руководителя</strong>
              {task.reviewComment}
            </p>
          </div>
        )}
        <footer className="drawer-actions">
          {role === "member" && task.status === "new" && (
            <button
              className="primary wide"
              onClick={() =>
                onUpdate(
                  task.id,
                  { status: "accepted" },
                  "Задача принята в работу",
                )
              }
            >
              Принять задачу
            </button>
          )}
          {role === "member" && task.status === "accepted" && (
            <button
              className="primary wide"
              onClick={() =>
                onUpdate(
                  task.id,
                  { status: "working" },
                  "Работа над задачей начата",
                )
              }
            >
              Начать работу
            </button>
          )}
          {role === "member" && task.status === "working" && (
            <>
              <button className="secondary">
                <Upload size={17} />
                Загрузить файл
              </button>
              <button className="primary" onClick={() => onSubmit(task)}>
                На проверку <Send size={17} />
              </button>
            </>
          )}
          {role === "chair" && task.status === "review" && (
            <>
              <button
                className="secondary danger"
                onClick={() =>
                  onUpdate(
                    task.id,
                    {
                      status: "working",
                      reviewComment:
                        "Необходимо дополнить пункт 3 и загрузить обновлённый вариант.",
                    },
                    "Задача возвращена на доработку",
                  )
                }
              >
                Нужна доработка
              </button>
              <button className="primary" onClick={() => onAccept(task)}>
                <Check size={17} />
                Принято
              </button>
            </>
          )}
          {task.status === "done" && (
            <div className="completed-banner">
              <Award />
              Результат принят · начислено {task.xp} XP
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

function CreateTask({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  const defaultDue = new Date(Date.now() + 48 * 3_600_000);
  defaultDue.setMinutes(0);
  return (
    <div className="overlay">
      <form className="modal create-modal" onSubmit={onSubmit}>
        <header>
          <div>
            <span className="eyebrow">Новое поручение</span>
            <h2>Создать задачу</h2>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="form-grid">
          <label className="full">
            Название задачи
            <input
              name="title"
              required
              placeholder="Что необходимо сделать?"
              autoFocus
            />
          </label>
          <label>
            Исполнитель
            <select name="assignee">
              {members.map((member) => (
                <option key={member}>{member}</option>
              ))}
            </select>
          </label>
          <label>
            Муниципалитет
            <select name="municipality">
              <option>Луганск</option>
              <option>Алчевск</option>
              <option>Краснодон</option>
              <option>Свердловск</option>
            </select>
          </label>
          <label>
            Проект
            <select name="project">
              <option>Знай свои права</option>
              <option>Открытый диалог</option>
              <option>Точки роста</option>
            </select>
          </label>
          <label>
            Направление
            <select name="direction">
              <option>Правовое просвещение</option>
              <option>Проектное управление</option>
              <option>Аналитика</option>
              <option>Мероприятия</option>
            </select>
          </label>
          <label className="full">
            Подробное описание
            <textarea
              name="description"
              required
              placeholder="Опишите контекст и ожидаемый результат"
              rows={3}
            />
          </label>
          <label>
            Приоритет
            <select name="priority">
              <option>Высокий</option>
              <option>Средний</option>
              <option>Обычный</option>
            </select>
          </label>
          <label>
            Дата и время дедлайна
            <input
              type="datetime-local"
              name="dueAt"
              required
              defaultValue={defaultDue.toISOString().slice(0, 16)}
            />
          </label>
          <label>
            Формат результата
            <input
              name="resultFormat"
              required
              defaultValue="Документ PDF или DOCX"
            />
          </label>
          <label>
            Материалы и ссылка
            <input placeholder="Добавить ссылку" />
          </label>
          <label className="full">
            Критерии выполнения
            <textarea
              name="criteria"
              required
              defaultValue="Предложено не менее 3 инициатив; указаны сроки и ответственные"
              rows={2}
            />
          </label>
        </div>
        <footer>
          <button type="button" className="secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="primary">
            <Send size={17} />
            Назначить задачу
          </button>
        </footer>
      </form>
    </div>
  );
}

function Communication({ onTask }: { onTask: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="Единый канал"
        title="Коммуникация"
        text="Рабочие обсуждения, проектные чаты и объявления."
      />
      <div className="messenger">
        <aside>
          <div className="chat-search">
            <Search />
            <span>Найти чат</span>
          </div>
          {[
            "Общий штаб",
            "Проект · Знай свои права",
            "Руководители направлений",
            "Молодёжный парламент · Луганск",
          ].map((x, i) => (
            <button className={i === 1 ? "active" : ""} key={x}>
              <span className="chat-avatar">
                {i === 0 ? "ОШ" : i === 1 ? "ЗП" : i === 2 ? "РН" : "ЛГ"}
              </span>
              <div>
                <strong>{x}</strong>
                <small>
                  {i === 1
                    ? "София: прикрепила документ"
                    : "Последнее сообщение"}
                </small>
              </div>
              {i < 2 && <i>{i + 1}</i>}
            </button>
          ))}
        </aside>
        <section>
          <header>
            <span className="chat-avatar">ЗП</span>
            <div>
              <strong>Проект · Знай свои права</strong>
              <small>12 участников · 6 в сети</small>
            </div>
            <button>
              <Search />
            </button>
            <button>
              <MoreHorizontal />
            </button>
          </header>
          <div className="messages">
            <span className="date-divider">Сегодня</span>
            <div className="message">
              <span className="mini-avatar">ДМ</span>
              <div>
                <strong>
                  {CHAIR_NAME} <small>10:24</small>
                </strong>
                <p>
                  Коллеги, необходимо подготовить предложения по проведению
                  муниципального этапа. Нужны конкретные форматы и сроки.
                </p>
                <footer>
                  <button onClick={onTask}>
                    <CheckCircle2 />
                    Создать задачу
                  </button>
                  <span>Принято: 4</span>
                </footer>
              </div>
            </div>
            <div className="message mine">
              <div>
                <strong>
                  {MEMBER_NAME} <small>10:31</small>
                </strong>
                <p>
                  Принято. Подготовлю варианты механик вовлечения участников.
                </p>
              </div>
            </div>
            {sent && (
              <div className="message mine">
                <div>
                  <strong>
                    Вы <small>сейчас</small>
                  </strong>
                  <p>Документ добавлен к задаче, можно проверять.</p>
                </div>
              </div>
            )}
          </div>
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              setSent(true);
            }}
          >
            <button type="button">
              <Paperclip />
            </button>
            <input placeholder="Написать сообщение..." />
            <button className="send">
              <Send />
            </button>
          </form>
        </section>
      </div>
    </>
  );
}

function InitiativesPage({
  initiatives,
  currentUsername,
  currentName,
  isChair,
  onCreate,
  onVote,
  onAdvance,
}: {
  initiatives: Initiative[];
  currentUsername: string;
  currentName: string;
  isChair: boolean;
  onCreate: () => void;
  onVote: (id: number) => void;
  onAdvance: (id: number) => void;
}) {
  const [filter, setFilter] = useState<"all" | "mine" | InitiativeStatus>("all");
  const filtered = initiatives.filter((initiative) => {
    if (filter === "mine") return initiative.author === currentName;
    if (filter === "all") return true;
    return initiative.status === filter;
  });
  const activeCount = initiatives.filter((item) => item.status === "active").length;
  const voteCount = initiatives.reduce((sum, item) => sum + item.votes.length, 0);
  return (
    <>
      <PageTitle
        eyebrow="Голос молодёжи"
        title="Инициативы"
        text="Банк идей, коллективная поддержка и прозрачный путь до результата."
        action={
          <button className="primary" onClick={onCreate}>
            <Plus size={18} />
            Предложить идею
          </button>
        }
      />
      <div className="initiative-summary">
        <div><Lightbulb /><strong>{initiatives.length}</strong><span>идей в банке</span></div>
        <div><Users /><strong>{voteCount}</strong><span>поддержок сообщества</span></div>
        <div><Target /><strong>{activeCount}</strong><span>инициатив в работе</span></div>
        <div><MapPin /><strong>14</strong><span>муниципалитетов</span></div>
      </div>
      <div className="initiative-toolbar">
        <div className="tabs">
          {[
            ["all", "Все идеи"],
            ["mine", "Мои идеи"],
            ["idea", "Новые"],
            ["review", "На рассмотрении"],
            ["active", "В работе"],
            ["done", "Результаты"],
          ].map(([value, label]) => (
            <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value as typeof filter)}>{label}</button>
          ))}
        </div>
        <span className="initiative-count">Показано: {filtered.length}</span>
      </div>
      <div className="initiative-grid">
        {filtered.map((initiative) => {
          const voted = initiative.votes.includes(currentUsername);
          const status = initiativeStatuses.find((item) => item.id === initiative.status)!;
          return (
            <article className="initiative-card" key={initiative.id}>
              <header>
                <span className={`initiative-status status-${initiative.status}`}>{status.label}</span>
                <small>#{String(initiative.id).padStart(3, "0")}</small>
              </header>
              <h3>{initiative.title}</h3>
              <p>{initiative.description}</p>
              <div className="initiative-tags"><span>{initiative.direction}</span><span><MapPin size={12} />{initiative.municipality}</span></div>
              <footer>
                <div className="initiative-author"><span className="mini-avatar">{initiative.author.split(" ").map((part) => part[0]).join("")}</span><small>{initiative.author}</small></div>
                <button className={`support-button ${voted ? "supported" : ""}`} onClick={() => onVote(initiative.id)}><HeartIcon filled={voted} /> {initiative.votes.length}</button>
              </footer>
              <div className="initiative-actions">
                <span>Потенциальный эффект: <b>{initiative.impact}</b></span>
                {isChair && initiative.status !== "done" && <button className="text-button" onClick={() => onAdvance(initiative.id)}>Следующий этап <ChevronRight size={14} /></button>}
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && <div className="empty-state panel"><Lightbulb /><strong>Здесь пока нет инициатив</strong><span>Предложите идею, которая улучшит жизнь молодёжи в вашем муниципалитете.</span><button className="primary" onClick={onCreate}>Создать первую идею</button></div>}
    </>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return <span className={`heart-icon ${filled ? "filled" : ""}`}>♥</span>;
}

function CreateInitiative({ onClose, onSubmit }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="overlay" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <form className="modal create-modal" onSubmit={onSubmit}>
        <header><div><span className="eyebrow"><Lightbulb size={14} /> Новый вклад</span><h2>Предложить инициативу</h2></div><button type="button" onClick={onClose}><X /></button></header>
        <div className="form-grid">
          <label className="full">Название идеи<input name="title" required minLength={5} placeholder="Например, Молодёжная карта возможностей" /></label>
          <label>Муниципалитет<select name="municipality" defaultValue="Луганск"><option>Луганск</option><option>Алчевск</option><option>Краснодон</option><option>Свердловск</option><option>Другой муниципалитет</option></select></label>
          <label>Направление<select name="direction" defaultValue="Образование и карьера"><option>Образование и карьера</option><option>Добровольчество</option><option>Культура и медиа</option><option>Спорт и здоровье</option><option>Городская среда</option></select></label>
          <label>Потенциальный эффект<select name="impact" defaultValue="Высокий"><option>Высокий</option><option>Средний</option><option>Локальный</option></select></label>
          <label className="full">Что изменится?<textarea name="description" required minLength={20} rows={4} placeholder="Опишите проблему, решение и пользу для молодых людей." /></label>
        </div>
        <footer><button type="button" className="secondary" onClick={onClose}>Отмена</button><button type="submit" className="primary"><Send size={16} />Добавить идею</button></footer>
      </form>
    </div>
  );
}

function OpportunitiesPage({
  opportunities,
  username,
  onSave,
  onApply,
}: {
  opportunities: Opportunity[];
  username: string;
  onSave: (id: number) => void;
  onApply: (id: number, motivation: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Все");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = opportunities.find((item) => item.id === selectedId) || null;
  const categories = ["Все", "Мои заявки", "Сохранённые", "Стажировка", "Обучение", "Конкурс", "Волонтёрство", "Грант"];
  const filtered = opportunities.filter((opportunity) => {
    const matchesQuery = `${opportunity.title} ${opportunity.organizer} ${opportunity.skills.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filter === "Мои заявки") return opportunity.applications.some((item) => item.username === username);
    if (filter === "Сохранённые") return opportunity.savedBy.includes(username);
    return filter === "Все" || opportunity.category === filter;
  });
  const appliedCount = opportunities.filter((item) => item.applications.some((application) => application.username === username)).length;
  const savedCount = opportunities.filter((item) => item.savedBy.includes(username)).length;
  return (
    <>
      <PageTitle
        eyebrow="Персональная траектория"
        title="Возможности"
        text="Стажировки, конкурсы, гранты, обучение и добровольчество в одном каталоге."
      />
      <section className="opportunity-hero">
        <div><span className="eyebrow"><Sparkles size={15} /> Подборка для вас</span><h2>Найдите следующий шаг для развития</h2><p>Сохраняйте интересные предложения и отправляйте заявки прямо из цифрового штаба.</p></div>
        <div className="opportunity-metrics"><span><strong>{opportunities.length}</strong>актуальных возможностей</span><span><strong>{appliedCount}</strong>моих заявок</span><span><strong>{savedCount}</strong>сохранено</span></div>
      </section>
      <div className="opportunity-controls">
        <label className="catalog-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по названию, организатору или навыку" /></label>
        <div className="opportunity-filters">{categories.map((category) => <button key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)}>{category}</button>)}</div>
      </div>
      <div className="opportunity-grid">
        {filtered.map((opportunity) => {
          const saved = opportunity.savedBy.includes(username);
          const applied = opportunity.applications.some((item) => item.username === username);
          return (
            <article className="opportunity-card" key={opportunity.id}>
              <header><span className={`opportunity-category category-${opportunity.category.toLowerCase()}`}>{opportunity.category}</span><button className={saved ? "saved" : ""} onClick={() => onSave(opportunity.id)} title="Сохранить"><Bookmark fill={saved ? "currentColor" : "none"} /></button></header>
              <div className="opportunity-logo"><BriefcaseBusiness /></div>
              <small>{opportunity.organizer}</small>
              <h3>{opportunity.title}</h3>
              <p>{opportunity.description}</p>
              <div className="opportunity-meta"><span><MapPin />{opportunity.location}</span><span><Clock3 />{countdown(opportunity.deadline)}</span></div>
              <div className="opportunity-skills">{opportunity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              <footer><span>{opportunity.seats} мест</span><button className={applied ? "applied" : ""} onClick={() => setSelectedId(opportunity.id)}>{applied ? "Заявка отправлена" : "Подробнее"}<ChevronRight /></button></footer>
            </article>
          );
        })}
      </div>
      {!filtered.length && <div className="empty-state panel"><Search /><strong>Ничего не найдено</strong><span>Попробуйте изменить запрос или выбрать другую категорию.</span><button className="secondary" onClick={() => { setQuery(""); setFilter("Все"); }}>Сбросить фильтры</button></div>}
      {selected && <OpportunityDialog opportunity={selected} username={username} onClose={() => setSelectedId(null)} onApply={onApply} onSave={onSave} />}
    </>
  );
}

function OpportunityDialog({
  opportunity,
  username,
  onClose,
  onApply,
  onSave,
}: {
  opportunity: Opportunity;
  username: string;
  onClose: () => void;
  onApply: (id: number, motivation: string) => void;
  onSave: (id: number) => void;
}) {
  const applied = opportunity.applications.some((item) => item.username === username);
  const saved = opportunity.savedBy.includes(username);
  return (
    <div className="overlay" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <div className="modal opportunity-dialog">
        <header><div><span className="eyebrow">{opportunity.category}</span><h2>{opportunity.title}</h2></div><button onClick={onClose}><X /></button></header>
        <div className="opportunity-detail">
          <div className="opportunity-detail-meta"><span><BriefcaseBusiness />{opportunity.organizer}</span><span><MapPin />{opportunity.location} · {opportunity.format}</span><span><Clock3 />{countdown(opportunity.deadline)}</span><span><Users />{opportunity.seats} мест</span></div>
          <h3>О возможности</h3><p>{opportunity.description}</p>
          <h3>Что вы сможете развить</h3><div className="opportunity-skills">{opportunity.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
          {applied ? <div className="application-success"><CheckCircle2 /><div><strong>Заявка отправлена</strong><span>Отклик сохранён. Следите за уведомлениями организатора.</span></div></div> : <form className="application-form" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onApply(opportunity.id, String(data.get("motivation"))); }}><label>Почему вам интересна эта возможность?<textarea name="motivation" required minLength={20} rows={4} placeholder="Коротко опишите мотивацию и полезный опыт" /></label><button className="primary"><Send size={16} />Отправить заявку</button></form>}
        </div>
        <footer><button className="secondary" onClick={() => onSave(opportunity.id)}><Bookmark size={16} fill={saved ? "currentColor" : "none"} />{saved ? "Сохранено" : "Сохранить"}</button><button className="secondary" onClick={onClose}>Закрыть</button></footer>
      </div>
    </div>
  );
}

function TeamsPage({ accounts }: { accounts: Account[] }) {
  const [categoryFilter, setCategoryFilter] = useState<"all" | ParticipantCategory>("all");
  const visibleAccounts = categoryFilter === "all" ? accounts : accounts.filter((account) => (account.category || "parliament") === categoryFilter);
  return (
    <>
      <PageTitle
        eyebrow="Совместная работа"
        title="Команды"
        text="Постоянные и временные группы для достижения конкретного результата."
        action={
          <button className="primary">
            <Plus />
            Создать команду
          </button>
        }
      />
      <div className="cards-grid">
        {[
          ["Команда #ЗнайСвоиПрава", "12 участников", "64%"],
          ["Открытый диалог", "8 участников", "43%"],
          ["Медиацентр парламента", "6 участников", "78%"],
        ].map((x, i) => (
          <article className="entity-card" key={x[0]}>
            <span className={`entity-icon c${i}`}>
              <Users />
            </span>
            <small>ПРОЕКТНАЯ КОМАНДА</small>
            <h3>{x[0]}</h3>
            <p>{x[1]} · Руководитель назначен</p>
            <div className="progress">
              <span style={{ width: x[2] }} />
            </div>
            <footer>
              <strong>{x[2]}</strong>
              <button>
                Открыть <ChevronRight />
              </button>
            </footer>
          </article>
        ))}
      </div>
      <div className="community-groups">
        {participantCategories.map((category) => (
          <button key={category.id} className={categoryFilter === category.id ? "active" : ""} onClick={() => setCategoryFilter(categoryFilter === category.id ? "all" : category.id)}>
            <span><Users /></span>
            <div><strong>{accounts.filter((account) => (account.category || "parliament") === category.id).length}</strong><small>{category.label}</small></div>
          </button>
        ))}
      </div>
      <section className="panel roster">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Единое сообщество</span>
            <h3>{categoryFilter === "all" ? "Участники молодёжной экосистемы" : categoryLabel(categoryFilter)}</h3>
          </div>
          <strong>{visibleAccounts.length} участников</strong>
        </div>
        <div className="roster-grid">
          {visibleAccounts.map((account) => (
            <article
              className={account.role === "chair" ? "chair" : ""}
              key={account.username}
            >
              <span>{account.initials}</span>
              <div>
                <strong>{account.name}</strong>
                <small>
                  {account.role === "chair" ? "Председатель · " : ""}{categoryLabel(account.category)}
                </small>
                {account.category === "municipal" && <small className="roster-municipality">{account.municipality}</small>}
              </div>
              {account.role === "chair" && <ShieldCheck />}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ProjectsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Портфель инициатив"
        title="Проекты"
        text="От замысла до измеримого результата в муниципалитетах."
        action={
          <button className="primary">
            <Plus />
            Новый проект
          </button>
        }
      />
      <div className="project-feature">
        <div>
          <span className="eyebrow">Флагманский проект</span>
          <h2>Знай свои права</h2>
          <p>
            Система практического правового просвещения молодёжи через
            муниципальные события и цифровые материалы.
          </p>
          <div className="project-facts">
            <span>
              <strong>12</strong>участников
            </span>
            <span>
              <strong>18</strong>задач
            </span>
            <span>
              <strong>7</strong>муниципалитетов
            </span>
          </div>
          <button className="primary">
            Страница проекта <ChevronRight />
          </button>
        </div>
        <div className="big-project-progress">
          <strong>64%</strong>
          <span>готовность проекта</span>
          <div className="progress">
            <span style={{ width: "64%" }} />
          </div>
          <small>Следующая точка: муниципальный этап · через 8 дней</small>
        </div>
      </div>
      <div className="cards-grid">
        <article className="entity-card">
          <span className="entity-icon c1">
            <Target />
          </span>
          <small>АКТИВНЫЙ</small>
          <h3>Открытый диалог</h3>
          <p>Прямое взаимодействие с молодёжью Республики</p>
        </article>
        <article className="entity-card">
          <span className="entity-icon c2">
            <Zap />
          </span>
          <small>ПЛАНИРОВАНИЕ</small>
          <h3>Точки роста</h3>
          <p>Акселератор муниципальных инициатив</p>
        </article>
      </div>
    </>
  );
}

function CalendarPage({ tasks }: { tasks: Task[] }) {
  return (
    <>
      <PageTitle
        eyebrow="Единый ритм"
        title="Календарь"
        text="Дедлайны, заседания, ВКС и контрольные точки."
        action={
          <button className="primary">
            <Plus />
            Добавить событие
          </button>
        }
      />
      <div className="calendar-layout">
        <section className="mini-calendar panel">
          <header>
            <button>‹</button>
            <h3>Сентябрь 2026</h3>
            <button>›</button>
          </header>
          <div className="weekdays">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((x) => (
              <b key={x}>{x}</b>
            ))}
          </div>
          <div className="days">
            {Array.from({ length: 35 }, (_, i) => i - 1).map((d, i) => (
              <button
                key={i}
                className={d === 22 ? "today" : d === 25 ? "event" : ""}
              >
                {d > 0 && d <= 30 ? d : ""}
              </button>
            ))}
          </div>
        </section>
        <section className="agenda panel">
          <span className="eyebrow">22 сентября · Сегодня</span>
          <h3>Повестка дня</h3>
          <div className="agenda-line">
            <time>10:00</time>
            <span className="blue" />
            <div>
              <strong>Работа по задачам проекта</strong>
              <small>Знай свои права</small>
            </div>
          </div>
          <div className="agenda-line">
            <time>15:30</time>
            <span className="orange" />
            <div>
              <strong>ВКС руководителей проектов</strong>
              <small>Переговорная · 45 минут</small>
            </div>
          </div>
          {tasks.slice(0, 2).map((t) => (
            <div className="agenda-line" key={t.id}>
              <time>18:00</time>
              <span className="red" />
              <div>
                <strong>Дедлайн: {t.title}</strong>
                <small>{t.assignee}</small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function LearningPage() {
  return (
    <>
      <PageTitle
        eyebrow="Персональная траектория"
        title="Развитие"
        text="Практические навыки для молодёжного парламентаризма."
      />
      <div className="learning-hero">
        <div>
          <span className="eyebrow">
            <Sparkles />
            30 дней · 30 шагов
          </span>
          <h2>Шаг 8. Найдите нормативную основу</h2>
          <p>
            Определите документы, регулирующие выбранную проблему
            муниципалитета.
          </p>
          <button className="primary">
            Продолжить путь <ChevronRight />
          </button>
        </div>
        <div className="day-counter">
          <strong>08</strong>
          <span>день из 30</span>
        </div>
      </div>
      <h2 className="section-heading">Учебные модули</h2>
      <div className="module-grid">
        {[
          "Основы парламентаризма",
          "Публичные выступления",
          "Проектное управление",
          "Нормативные документы",
          "Командная работа",
          "Парламентская практика",
        ].map((x, i) => (
          <button className="module-card" key={x}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <div>
              <strong>{x}</strong>
              <small>
                {i < 2 ? "В процессе · " + (65 - i * 24) + "%" : "4–6 заданий"}
              </small>
            </div>
            {i < 2 ? (
              <div className="progress">
                <i style={{ width: `${65 - i * 24}%` }} />
              </div>
            ) : (
              <ChevronRight />
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function AwardsPage() {
  return (
    <>
      <PageTitle
        eyebrow="Профессиональный рост"
        title="Достижения"
        text="Результаты, навыки и вклад в общую работу."
      />
      <div className="award-summary">
        <span>
          <Trophy />
        </span>
        <div>
          <small>Открыто достижений</small>
          <strong>8 из 24</strong>
          <div className="progress">
            <i style={{ width: "33%" }} />
          </div>
        </div>
        <p>
          Следующее: <b>«Проектировщик»</b>
          <br />
          Завершите ещё один проектный модуль
        </p>
      </div>
      <div className="awards-grid">
        {[
          ["Первый результат", "Первая задача принята руководителем", "gold"],
          ["Выполнено вовремя", "5 задач без нарушения срока", "violet"],
          ["Командный игрок", "Участие в трёх командных задачах", "blue"],
          ["Развитие", "Завершён учебный модуль", "green"],
          ["Проектировщик", "Подготовлена проектная инициатива", "locked"],
          ["Парламентская практика", "Участие в заседании", "locked"],
        ].map((x) => (
          <article className={`award ${x[2]}`} key={x[0]}>
            <span>
              <Award />
            </span>
            <h3>{x[0]}</h3>
            <p>{x[1]}</p>
            <small>{x[2] === "locked" ? "Ещё не открыто" : "Получено"}</small>
          </article>
        ))}
      </div>
    </>
  );
}

function AnalyticsPage({
  stats,
}: {
  stats: { done: number; working: number; review: number; overdue: number };
}) {
  const bars = [62, 74, 69, 81, 77, 88, 92];
  return (
    <>
      <PageTitle
        eyebrow="Управление на данных"
        title="Аналитика"
        text="Динамика исполнения, качество результатов и активность команды."
      />
      <div className="analytics-stats">
        <Stat
          tone="green"
          icon={CheckCircle2}
          value="87%"
          label="Соблюдение сроков"
        />
        <Stat
          tone="blue"
          icon={Star}
          value="4,6"
          label="Качество результатов"
        />
        <Stat
          tone="orange"
          icon={Activity}
          value="82%"
          label="Активные участники"
        />
      </div>
      <div className="analytics-grid">
        <section className="panel chart">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Последние 7 дней</span>
              <h3>Динамика исполнения</h3>
            </div>
            <button className="filter">
              Неделя <ChevronDown />
            </button>
          </div>
          <div className="bars">
            {bars.map((x, i) => (
              <div key={i}>
                <span style={{ height: `${x}%` }} />
                <small>{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][i]}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="panel quality">
          <span className="eyebrow">Контроль качества</span>
          <h3>Результаты проверки</h3>
          <div className="donut">
            <div>
              <strong>76%</strong>
              <small>принято сразу</small>
            </div>
          </div>
          <ul>
            <li>
              <i className="green" />
              Принято <b>76%</b>
            </li>
            <li>
              <i className="orange" />
              Доработка <b>19%</b>
            </li>
            <li>
              <i className="red" />
              Отклонено <b>5%</b>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}

function ProfilePage({
  user,
  xp,
  onChangePassword,
}: {
  user: { name: string; username: string; role: string; initials: string; category: ParticipantCategory; municipality: string };
  xp: number;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<string | null>;
}) {
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);
  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nextPassword = String(data.get("newPassword"));
    if (nextPassword !== String(data.get("confirmPassword"))) {
      setPasswordChanged(false);
      setPasswordMessage("Новые пароли не совпадают");
      return;
    }
    const error = await onChangePassword(
      String(data.get("currentPassword")),
      nextPassword,
    );
    setPasswordChanged(!error);
    setPasswordMessage(error || "Пароль успешно изменён");
    if (!error) form.reset();
  };
  return (
    <>
      <div className="profile-hero">
        <div className="profile-avatar">
          {user.initials}
          <span>
            <ShieldCheck />
          </span>
        </div>
        <div>
          <span className="eyebrow">Личная карточка участника</span>
          <h1>{user.name}</h1>
          <p>{user.role} · Молодёжная экосистема ЛНР</p>
          <div className="profile-tags">
            <span>{categoryLabel(user.category)}</span>
            <span>{user.municipality}</span>
            <span>Уровень 6 · Управленец</span>
            <span>В системе 184 дня</span>
          </div>
        </div>
        <span className="account-login">Логин: {user.username}</span>
      </div>
      <div className="profile-grid">
        <section className="panel xp-panel">
          <span className="eyebrow">Опыт и уровень</span>
          <div>
            <strong>{xp}</strong>
            <small>XP накоплено</small>
          </div>
          <div className="progress">
            <span style={{ width: `${Math.min(100, (xp % 1500) / 15)}%` }} />
          </div>
          <p>
            До уровня «Молодёжный парламентарий»{" "}
            <b>{Math.max(0, 1500 - xp)} XP</b>
          </p>
        </section>
        <section className="panel skill-panel">
          <span className="eyebrow">Подтверждённые навыки</span>
          {[
            ["Проектное управление", 82],
            ["Командная работа", 76],
            ["Аналитика", 68],
            ["Публичные выступления", 59],
          ].map((x) => (
            <div key={x[0]}>
              <span>{x[0]}</span>
              <div className="progress">
                <i style={{ width: `${x[1]}%` }} />
              </div>
              <b>{x[1]}%</b>
            </div>
          ))}
        </section>
        <section className="panel security-panel">
          <div>
            <span className="eyebrow">Безопасность аккаунта</span>
            <h3>Изменить пароль</h3>
            <p>Используйте не менее 8 символов. Новый пароль потребуется при следующем входе.</p>
          </div>
          <form onSubmit={submitPassword}>
            <label>
              Текущий пароль
              <input name="currentPassword" type="password" required autoComplete="current-password" />
            </label>
            <label>
              Новый пароль
              <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label>
              Повторите пароль
              <input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <button className="primary">Сохранить пароль</button>
          </form>
          {passwordMessage && (
            <div className={passwordChanged ? "password-message success" : "password-message error"}>
              {passwordChanged ? <CheckCircle2 /> : <CircleAlert />}
              {passwordMessage}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function AdminPage({
  stats,
  onNavigate,
}: {
  stats: { done: number; working: number; review: number; overdue: number };
  onNavigate: (p: Page) => void;
}) {
  return (
    <>
      <PageTitle
        eyebrow="Панель председателя"
        title="Управление"
        text="Общая ситуация, контроль исполнения и системные настройки."
      />
      <div className="admin-identity">
        <img src={logoUrl} alt="Молодёжный парламент при Народном Совете ЛНР" />
        <div>
          <span className="eyebrow">Официальное пространство</span>
          <strong>Единый цифровой штаб</strong>
          <small>Молодёжный парламент при Народном Совете ЛНР</small>
        </div>
      </div>
      <div className="admin-banner">
        <div>
          <ShieldCheck />
          <span>
            <small>Состояние системы</small>
            <strong>Все контуры работают штатно</strong>
          </span>
        </div>
        <small>Последняя синхронизация: сейчас</small>
      </div>
      <div className="admin-stats">
        {[
          ["Участники", "32", "официальный состав"],
          ["Активные проекты", "9", "3 контрольные точки"],
          ["Задачи в работе", String(stats.working), "87% в срок"],
          ["Муниципалитеты", "28", "единый контур палат"],
        ].map((x) => (
          <article key={x[0]}>
            <small>{x[0]}</small>
            <strong>{x[1]}</strong>
            <span>{x[2]}</span>
          </article>
        ))}
      </div>
      <section className="attention">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Контроль</span>
            <h3>Требует внимания</h3>
          </div>
          <button className="text-button" onClick={() => onNavigate("tasks")}>
            Перейти к задачам <ChevronRight />
          </button>
        </div>
        <div className="attention-grid">
          <button className="red">
            <CircleAlert />
            <strong>{stats.overdue || 7}</strong>
            <span>просроченных задач</span>
          </button>
          <button className="orange">
            <Clock3 />
            <strong>12</strong>
            <span>дедлайн в течение 48 часов</span>
          </button>
          <button className="yellow">
            <FileText />
            <strong>{stats.review || 4}</strong>
            <span>результата ожидают проверки</span>
          </button>
        </div>
      </section>
      <div className="management-list panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">Структура</span>
            <h3>Управление системой</h3>
          </div>
        </div>
        {[
          [Users, "Пользователи и роли", "32 учётные записи"],
          [ShieldCheck, "Матрица разрешений", "11 ролей и 36 разрешений"],
          [Award, "Конструктор достижений", "24 достижения"],
          [Activity, "Журнал действий", "Безопасность и аудит"],
        ].map(([Icon, title, sub]) => (
          <button key={String(title)}>
            <span>
              <Icon />
            </span>
            <div>
              <strong>{String(title)}</strong>
              <small>{String(sub)}</small>
            </div>
            <ChevronRight />
          </button>
        ))}
      </div>
    </>
  );
}

function Notifications({
  notices,
  onRead,
}: {
  notices: Notice[];
  onRead: () => void;
}) {
  return (
    <div className="notifications">
      <header>
        <h3>Уведомления</h3>
        <button onClick={onRead}>Прочитать все</button>
      </header>
      {notices.map((n) => (
        <div className={n.read ? "" : "unread"} key={n.id}>
          <span>
            {n.kind === "task" ? (
              <CheckCircle2 />
            ) : n.kind === "message" ? (
              <MessageSquare />
            ) : (
              <Award />
            )}
          </span>
          <p>
            <strong>{n.title}</strong>
            <small>{n.detail}</small>
          </p>
        </div>
      ))}
    </div>
  );
}

function SearchDialog({
  tasks,
  onClose,
  onTask,
}: {
  tasks: Task[];
  onClose: () => void;
  onTask: (t: Task) => void;
}) {
  const [query, setQuery] = useState("");
  const found = tasks.filter((t) =>
    (t.title + t.assignee + t.project)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div
      className="overlay search-overlay"
      onMouseDown={(e) => e.currentTarget === e.target && onClose()}
    >
      <div className="search-modal">
        <div>
          <Search />
          <input
            autoFocus
            placeholder="Задача, человек, проект, документ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>ESC</kbd>
        </div>
        <small>БЫСТРЫЙ ПОИСК</small>
        {found.slice(0, 5).map((t) => (
          <button key={t.id} onClick={() => onTask(t)}>
            <CheckCircle2 />
            <span>
              <strong>{t.title}</strong>
              <small>
                {t.assignee} · {t.project}
              </small>
            </span>
            <ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
