# BirdWatches

Трекер спутников в реальном времени на 3D-глобусе с прицелом на радиолюбительский приём (SDR).

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

## Возможности (MVP)

- 3D-глобус Земли с ночной текстурой и звёздным фоном
- Загрузка TLE-данных с CelesTrak (группа `stations` — ISS и космические станции)
- Расчёт позиций спутников через SGP4-пропагатор (satellite.js)
- Обновление позиций каждую секунду в реальном времени
- Клик по спутнику — отображение широты, долготы, высоты и скорости
- Боковая панель со списком всех спутников
- API-прокси к CelesTrak с кешированием (1 час)
- Тёмная тема по умолчанию

## Roadmap

- [ ] Pass predictor — предсказание пролётов над точкой наблюдения
- [ ] Sky view — полярная диаграмма (azimuth/elevation)
- [ ] Doppler calculator — расчёт доплеровского сдвига для радиочастот
- [ ] SDR bridge — интеграция с SDR-приёмником (RTL-SDR, HackRF)
- [ ] Поддержка Space-Track.org как альтернативного источника TLE
- [ ] Web Worker для пропагации больших групп спутников

## Стек

| Категория | Технология |
|-----------|-----------|
| Фреймворк | Next.js 15 (App Router) |
| Язык | TypeScript (strict) |
| 3D-визуализация | react-globe.gl + Three.js |
| Орбитальная механика | satellite.js (SGP4/SDP4) |
| Стейт-менеджер | Zustand |
| Стили | Tailwind CSS |
| Пакетный менеджер | pnpm |
| Деплой | Vercel |

## Как запустить локально

```bash
# Клонировать репозиторий
git clone https://github.com/your-username/birdwatch.git
cd birdwatch

# Установить зависимости
pnpm install

# Запустить dev-сервер (Turbopack)
pnpm dev

# Открыть в браузере
# http://localhost:3000
```

### Другие команды

```bash
pnpm build       # Production-сборка
pnpm start       # Запуск production-сервера
pnpm lint        # Линтинг (ESLint)
pnpm typecheck   # Проверка типов (tsc --noEmit)
```

## Деплой на Vercel

1. Импортируйте репозиторий в [Vercel](https://vercel.com/new)
2. Vercel автоматически определит Next.js и настроит сборку
3. Дополнительные переменные окружения не обязательны — без них приложение работает на CelesTrak

### Space-Track (необязательно)

Публичный фид CelesTrak обрывается на каталожном номере 69998 и не содержит объектов
в формате Alpha-5, поэтому всё, что пронумеровано выше 99999, в нём отсутствует —
например, вторая партия «Рассветов» (100083–100098). Эти аппараты есть в каталоге
NORAD напрямую, но он требует авторизации.

Заведите бесплатный аккаунт на [space-track.org](https://www.space-track.org/auth/createAccount)
и задайте переменные окружения:

```
SPACETRACK_IDENTITY=ваш-email
SPACETRACK_PASSWORD=ваш-пароль
```

Без них тумблер «Space-Track» в панели источников ничего не меняет: запрос
дополнения тихо возвращает пустой результат, и группа собирается из одного CelesTrak.
Ответы кэшируются на час — у Space-Track лимит 30 запросов в минуту.

## Источники данных

- **[CelesTrak](https://celestrak.org/)** — TLE-данные от Dr. T.S. Kelso. Поддерживаемые группы: `stations`, `weather`, `noaa`, `amateur`, `starlink`, `gps-ops`, `active`
- **[Space-Track.org](https://www.space-track.org/)** — каталог NORAD напрямую. Дополняет CelesTrak объектами, которых в его публичном фиде нет (номера выше 99999). Включается тумблером в панели источников, требует регистрацию — см. раздел про деплой

## Лицензия

MIT
