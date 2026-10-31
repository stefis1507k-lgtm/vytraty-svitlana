// Стартові дані трекера «Витрати»: розділи (категорії) і записів ще немає.
// Фото лежать у папці photos/ (обрізані до 16:9).
const T = "2026-10-31T00:00:00.000Z";
export const seedData = {
  version: 1,
  categories: [
    { id: "housing-car", name: "Житло, авто", image: "photos/living-room.jpg", order: 1, hidden: false, createdAt: T },
    { id: "groceries-home", name: "Продукти, товари для дому", image: "photos/groceries.jpg", order: 2, hidden: false, createdAt: T },
    { id: "health-beauty-sport", name: "Здоров'я, краса, спорт", image: "photos/skincare.jpg", order: 3, hidden: false, createdAt: T },
    { id: "shopping", name: "Покупки", image: "photos/bags.jpg", order: 4, hidden: false, createdAt: T },
    { id: "development-leisure-travel", name: "Розвиток, розваги, подорожі", image: "photos/travel.jpg", order: 5, hidden: false, createdAt: T },
    { id: "business-investments", name: "Інвестиції в бізнес", image: "photos/business.jpg", order: 6, hidden: false, createdAt: T },
    { id: "other", name: "Інше", image: "photos/other.jpg", order: 7, hidden: false, createdAt: T },
    { id: "income-salary-anya", name: "ЗП Аня", kind: "income", image: "photos/income-apartment-cherkasy.jpg", order: 8, hidden: false, createdAt: T },
    { id: "income-apartment-cherkasy", name: "квартира Черкаси", kind: "income", image: "photos/income-salary-anya.jpg", order: 9, hidden: false, createdAt: T },
    { id: "income-ai-projects", name: "АІ-проєкти", kind: "income", image: "photos/income-ai-projects.jpg", order: 10, hidden: false, createdAt: T },
  ],
  entries: [],
};
