export type CabinetDefinition = {
  id: string;
  name: string;
  icon: string;
  exercises: string[];
};

export const CABINETS: CabinetDefinition[] = [
  {
    id: "surd",
    name: "Сурдолог / Аудиорехабилитатор",
    icon: "У",
    exercises: ["Аудитивен тренинг", "Артикулација", "Фонолошка свесност", "Говорна флуентност", "ААК / Комуникација", "Знаковен јазик"]
  },
  {
    id: "logo",
    name: "Логопед",
    icon: "Л",
    exercises: ["Артикулација", "Фонологија", "Јазично разбирање", "Прагматика", "Писменост", "Флуентност"]
  },
  {
    id: "tifl",
    name: "Тифлолог",
    icon: "Т",
    exercises: ["Ортооптички вежби", "Плеоптички вежби", "Брајово писмо", "Ориентација", "Мобилност"]
  },
  {
    id: "biof",
    name: "Биофидбек",
    icon: "Б",
    exercises: ["Внимание", "Концентрација", "Саморегулација", "Релаксација"]
  },
  {
    id: "psih",
    name: "Психомоторна",
    icon: "П",
    exercises: ["Груба моторика", "Фина моторика", "Координација", "Рамнотежа", "Латерализација"]
  },
  {
    id: "senz",
    name: "Сензорна интеграција",
    icon: "С",
    exercises: ["Тактилна обработка", "Вестибуларна обработка", "Проприоцепција", "Визуелна обработка"]
  },
  {
    id: "mont",
    name: "Монтесори",
    icon: "М",
    exercises: ["Когнитивен развој", "Самостојност", "Концентрација", "Секвенционирање"]
  },
  {
    id: "rana",
    name: "Рана интервенција",
    icon: "Р",
    exercises: ["Комуникација", "Когниција", "Моторика", "Социјализација", "Емоционален развој"]
  }
];

export const PROGRAM_TYPES = ["Редовна", "Модифицирана", "Индивидуална"] as const;
export const QUARTER_LABELS = ["Q1 (Септ-Ноем)", "Q2 (Дек-Фев)", "Q3 (Март-Апр)", "Q4 (Мај-Јуни)"] as const;
export const LEVEL_LABELS = ["Почетно", "Во развој", "Напредно", "Постигнато"] as const;
export const SCALE_LABELS = ["Не реагира", "Целосна помош", "Делумна помош", "Минимална помош", "Самостојно"] as const;
export const PLAN_STATUSES = ["draft", "active", "completed", "archived"] as const;

export function getCabinetById(id: string) {
  return CABINETS.find((cabinet) => cabinet.id === id) ?? null;
}
