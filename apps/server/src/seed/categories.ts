export type SeedCategory = {
  name: string;
  slug: string;
  icon: string;
  children?: Array<Omit<SeedCategory, 'children'>>;
};

export const CATEGORY_TREE: SeedCategory[] = [
  {
    name: 'Сантехник',
    slug: 'santekhnik',
    icon: '🚿',
    children: [
      { name: 'Цахилгаан халаагуур', slug: 'tsakhilgaan-khalaaguur', icon: '♨️' },
      { name: 'Багаж', slug: 'santekhnik-bagaj', icon: '🔧' },
      { name: 'Бусад', slug: 'santekhnik-busad', icon: '📦' },
      { name: 'Ариун цэврийн өрөөний тоноглол', slug: 'ariun-tsever-tonoglol', icon: '🚽' },
      { name: 'Хэмжих хэрэгсэл', slug: 'khemjikh-kheregsel', icon: '📏' },
      { name: 'Бохир усны систем', slug: 'bokhir-usnii-system', icon: '🧰' },
      { name: 'Насос', slug: 'nasos', icon: '⚙️' },
      { name: 'Паар, коллектор', slug: 'paar-kollektor', icon: '🔥' },
      { name: 'Холбох хэрэгслүүд', slug: 'kholbokh-kheregsluud', icon: '🔩' },
      { name: 'Бохирын таг', slug: 'bokhiriin-tag', icon: '🕳️' },
      { name: 'Дулаалгын материал', slug: 'santekhnik-dulaalga', icon: '🧱' },
      { name: 'Коллектор, паарны холбохууд', slug: 'kollektor-paar-kholbokh', icon: '🔗' },
      { name: 'Гагнадаг холбох', slug: 'gagnadag-kholbokh', icon: '🧯' },
      { name: 'PVC', slug: 'pvc', icon: '🧪' },
      { name: 'PPR', slug: 'ppr', icon: '🧪' },
    ],
  },
  {
    name: 'Засал чимэглэл',
    slug: 'zasal-chimeglel',
    icon: '🎨',
    children: [
      { name: 'Обой, хуулга', slug: 'oboi-khuulga', icon: '🧻' },
      { name: 'Хуурай хольц', slug: 'khuurain-kholits', icon: '🥣' },
      { name: 'Будаг, Эмульс, Цавуу, Силикон', slug: 'budag-emuls-tsavuu-silikon', icon: '🖌️' },
      { name: 'Плита, чулуу', slug: 'plita-chuluu', icon: '🧱' },
      { name: 'Ус чийг тусгаарлагч', slug: 'us-chiig-tusgaarlagch', icon: '💧' },
      { name: 'Паркет, чулуун шал', slug: 'parket-chuluun-shal', icon: '🪵' },
      { name: 'Хаалга, цоож', slug: 'khaalga-tsooj', icon: '🚪' },
      { name: 'Рейк, ханын хавтан', slug: 'reik-khaniin-khavtan', icon: '🏗️' },
      { name: 'Бусад', slug: 'zasal-busad', icon: '📦' },
      { name: 'Шал, хана, таазны хүрээ', slug: 'shal-khana-taaz-khuree', icon: '🏠' },
      { name: 'Панер, OSB DSB хавтан', slug: 'paner-osb-dsb-khavtan', icon: '🪵' },
    ],
  },
  {
    name: 'Гэрэл цахилгаан',
    slug: 'gerel-tsakhilgaan',
    icon: '💡',
    children: [
      { name: 'Багаж', slug: 'gerel-tsakhilgaan-bagaj', icon: '🔧' },
      { name: 'Бусад', slug: 'gerel-tsakhilgaan-busad', icon: '📦' },
      { name: 'Гэрэл, абажур, прожектор', slug: 'gerel-abajur-projektor', icon: '💡' },
      { name: 'Автомат цахилгааны тоноглол', slug: 'avtomat-tsakhilgaan-tonoglol', icon: '⚡' },
      { name: 'Тог мэдрэгч', slug: 'tog-medregch', icon: '📟' },
      { name: 'Разетка, унтраалга', slug: 'razetka-untraalga', icon: '🔌' },
      { name: 'Кабель, утасны тоноглол', slug: 'kabel-utas-tonoglol', icon: '〰️' },
      { name: 'Цахилгааны аюулгүй байдлын систем', slug: 'tsakhilgaan-ayuulgui-system', icon: '🛡️' },
      { name: 'Тоолуур', slug: 'tooluur', icon: '🧮' },
      { name: 'Өндөр хүчдэл', slug: 'undur-khuchdel', icon: '⚠️' },
    ],
  },
  {
    name: 'Багаж, тоног төхөөрөмж',
    slug: 'bagaj-tonog-tukhuurumj',
    icon: '🛠️',
    children: [
      { name: 'Бусад', slug: 'bagaj-busad', icon: '📦' },
      { name: 'Баттерэйтэй багаж', slug: 'battereitei-bagaj', icon: '🔋' },
      { name: 'Гар багаж', slug: 'gar-bagaj', icon: '🔨' },
      { name: 'Цахилгаан багаж', slug: 'tsakhilgaan-bagaj', icon: '⚡' },
      { name: 'Хийн багаж', slug: 'khiin-bagaj', icon: '💨' },
      { name: 'Тоног төхөөрөмж', slug: 'tonog-tukhuurumj', icon: '⚙️' },
    ],
  },
  {
    name: 'Дээвэр, Гадна Фасад, Салхивч',
    slug: 'deever-gadna-fasad-salkhivch',
    icon: '🏘️',
    children: [
      { name: 'Хар цаас', slug: 'khar-tsaas', icon: '📄' },
      { name: 'Ус тусгаарлагч', slug: 'us-tusgaarlagch', icon: '💧' },
      { name: 'Дээврийн төмөр', slug: 'deevriin-tumur', icon: '🏠' },
      { name: 'Террасын материал', slug: 'terrasiin-material', icon: '🪵' },
      { name: 'Бусад', slug: 'deever-busad', icon: '📦' },
      { name: 'Дулаалгын материал', slug: 'deever-dulaalga', icon: '🧱' },
      { name: 'Дээврийн материал', slug: 'deevriin-material', icon: '🏗️' },
      { name: 'Сайдинг', slug: 'saiding', icon: '🏢' },
      { name: 'Салхивч, Агааржуулалт', slug: 'salkhivch-agaarjuulalt', icon: '🌬️' },
      { name: 'Металл, Чулуун фасад', slug: 'metall-chuluun-fasad', icon: '🧱' },
    ],
  },
  {
    name: 'Төмөр ба модон бэлдэц',
    slug: 'tumur-modon-beldets',
    icon: '🪵',
    children: [
      { name: 'Модон бэлдэц', slug: 'modon-beldets', icon: '🪵' },
      { name: 'Төмөр бэлдэц', slug: 'tumur-beldets', icon: '🔩' },
      { name: 'Бусад', slug: 'beldets-busad', icon: '📦' },
      { name: 'Төмөр тор', slug: 'tumur-tor', icon: '🧱' },
      { name: 'Хэв хашмал', slug: 'khev-khashmal', icon: '🏗️' },
    ],
  },
  {
    name: 'Жижиг бараа & ХАБЭА',
    slug: 'jijig-baraa-khabea',
    icon: '🦺',
    children: [
      { name: 'Шруп, хадаас, эрэг, боолт', slug: 'shrup-khadaas-ereg-boolt', icon: '🔩' },
      { name: 'Бусад', slug: 'jijig-baraa-busad', icon: '📦' },
      { name: 'ХАБ хувцас, хэрэглэл', slug: 'khab-khuvtsas-khereglel', icon: '🦺' },
    ],
  },
  {
    name: 'Байгууллага, үйлчилгээ',
    slug: 'baiguullaga-uilchilgee',
    icon: '🏢',
    children: [
      { name: 'Нураалт', slug: 'nuraalt', icon: '🏚️' },
      { name: 'Цутгалт', slug: 'tsutgalt', icon: '🚧' },
      { name: 'Цэвэрлэгээ', slug: 'tseverlegee', icon: '🧹' },
      { name: 'Гадна фасад, ландшафт', slug: 'gadna-fasad-landshaft', icon: '🌿' },
      { name: 'Бусад', slug: 'uilchilgee-busad', icon: '📦' },
    ],
  },
];

export const TOP_CATEGORIES = CATEGORY_TREE;
