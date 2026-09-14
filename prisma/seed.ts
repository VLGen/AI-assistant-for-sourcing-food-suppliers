import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const categories = [
  "ингредиенты",
  "готовая продукция",
  "упаковка",
  "оборудование",
  "логистика",
];

const regions = [
  "Москва",
  "Санкт-Петербург",
  "Краснодарский край",
  "Татарстан",
  "Новосибирская область",
  "Свердловская область",
];

const citiesByRegion: Record<string, string[]> = {
  Москва: ["Москва", "Подольск", "Люберцы", "Мытищи"],
  "Санкт-Петербург": ["Санкт-Петербург", "Пушкин", "Колпино", "Гатчина"],
  "Краснодарский край": ["Краснодар", "Сочи", "Новороссийск", "Армавир"],
  Татарстан: ["Казань", "Набережные Челны", "Елабуга", "Альметьевск"],
  "Новосибирская область": ["Новосибирск", "Бердск", "Омск", "Искитим"],
  "Свердловская область": ["Екатеринбург", "Нижний Тагил", "Пермь", "Серов"],
};

const minOrderOptions = [
  "от 50 кг",
  "от 1 тонны",
  "от 10 паллет",
  "от 100 шт",
];

const priceRangeOptions = [
  "180–220 ₽/кг",
  "договорная",
  "от 95 ₽/л",
  "договорная",
  "180–220 ₽/кг",
  "от 95 ₽/л",
];

const certificatePool = [
  "ISO 22000",
  "HACCP",
  "Декларация ТС",
  "Сертификат Halal",
  "GMP+",
  "FSSC 22000",
];

const deliveryTermsOptions = [
  "СДЭК, самовывоз",
  "Собственная логистика по РФ",
  "Только самовывоз",
  "Доставка от 5 дней по ЦФО",
  "Доставка до 3 дней по Москве и МО",
  "Самовывоз с производственного склада",
];

const companyNames = [
  "ООО \"АгроРитм\"",
  "АО \"МилкСервис\"",
  "ООО \"Зеленый Путь\"",
  "ИП Соловьев А. В.",
  "ООО \"Северный Флот\"",
  "АО \"ТерраФуд\"",
  "ООО \"Белый Лес\"",
  "ИП Кузнецов И. С.",
  "АО \"Промтрейд\"",
  "ООО \"Ферма Экспресс\"",
  "ИП Григорьев Д. Н.",
  "ООО \"Кубанский Ключ\"",
  "АО \"НордПак\"",
  "ООО \"Латте Мастер\"",
  "ИП Воронин П. А.",
  "ООО \"Полярный Склад\"",
  "АО \"ВостокПродукт\"",
  "ООО \"КрафтЛайн\"",
  "ИП Мельников К. О.",
  "АО \"Сибирский Крон\"",
  "ООО \"Южный Тракт\"",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomCategorySet(): string[] {
  const shuffled = [...categories].sort(() => Math.random() - 0.5);
  const length = faker.number.int({ min: 1, max: 2 });
  return shuffled.slice(0, length);
}

function randomCertificateSet(): string[] {
  const count = Math.random() < 0.6 ? faker.number.int({ min: 1, max: 3 }) : 0;
  if (count === 0) return [];
  return [...certificatePool].sort(() => Math.random() - 0.5).slice(0, count);
}

function randomBoolean(probability: number) {
  return Math.random() < probability;
}

async function main() {
  await prisma.note.deleteMany();
  await prisma.shortlist.deleteMany();
  await prisma.supplier.deleteMany();

  const suppliers = Array.from({ length: 40 }, (_, index) => {
    const region = regions[index % regions.length];
    const cities = citiesByRegion[region];
    const city = cities[Math.floor(Math.random() * cities.length)] ?? region;
    const name = companyNames[index % companyNames.length];
    const categoriesData = randomCategorySet();
    const certificatesData = randomCertificateSet();
    const website = randomBoolean(0.8) ? `https://${faker.internet.domainName()}` : null;
    const contactEmail = randomBoolean(0.8) ? faker.internet.email({ firstName: faker.person.firstName(), lastName: faker.person.lastName() }) : null;
    const contactPhone = randomBoolean(0.8) ? faker.phone.number({ style: "international" }) : null;
    const verified = randomBoolean(0.3);
    const sourceUrl = `https://www.example.com/${faker.internet.domainWord()}/${faker.helpers.slugify(name).toLowerCase()}`;

    return {
      name,
      categories: JSON.stringify(categoriesData),
      region,
      city,
      website,
      contactEmail,
      contactPhone,
      sourceUrl,
      minOrder: pick(minOrderOptions),
      priceRange: pick(priceRangeOptions),
      certificates: JSON.stringify(certificatesData),
      deliveryTerms: pick(deliveryTermsOptions),
      workRegion: JSON.stringify([region, pick(regions)]),
      notes: randomBoolean(0.5) ? faker.lorem.sentences({ min: 1, max: 3 }) : null,
      verified,
    };
  });

  await prisma.supplier.createMany({
    data: suppliers,
  });

  const count = await prisma.supplier.count();

  console.log(`Seed complete: ${count} suppliers created.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
