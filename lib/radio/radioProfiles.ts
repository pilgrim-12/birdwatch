export type RadioMode =
  | 'APT'
  | 'LRPT'
  | 'FM_VOICE'
  | 'SSB_LINEAR'
  | 'SSTV'
  | 'PACKET'
  | 'CW'
  | 'BPSK'
  | 'DSB'
  | 'BEACON'
  | 'AHRPT'
  | 'HRIT';

export type RadioStatus =
  | 'active'
  | 'inactive'
  | 'intermittent'
  | 'unavailable_for_rtlsdr';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Downlink {
  frequencyHz: number;
  bandwidthHz: number;
  mode: RadioMode;
  description?: string;
}

export interface RadioProfile {
  noradId: number;
  status: RadioStatus;
  downlinks: Downlink[];
  difficulty: Difficulty;
  antenna: string;
  satdumpPipeline?: string;
  samplerateHz?: number;
  whatYouReceive: string;
  howToReceive: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Individual satellite profiles keyed by NORAD catalog number
// ---------------------------------------------------------------------------

const PROFILES: RadioProfile[] = [
  // ── NOAA APT (active) ──────────────────────────────────────────────────
  {
    noradId: 25338, // NOAA 15
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_620_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT analog weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (горизонтально) или QFH',
    satdumpPipeline: 'noaa_apt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Аналоговые APT-снимки облачности в реальном времени — два канала рядом: видимый и инфракрасный. Полоса захвата ~2900 км.',
    howToReceive:
      'V-dipole 137 МГц горизонтально или QFH. RTL-SDR на 137.620 МГц, ширина 40 кГц, режим WFM. SatDump pipeline noaa_apt декодирует автоматически.',
  },
  {
    noradId: 28654, // NOAA 18
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_912_500,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT analog weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (горизонтально) или QFH',
    satdumpPipeline: 'noaa_apt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Аналоговые APT-снимки облачности в реальном времени — два канала: видимый и инфракрасный. Полоса захвата ~2900 км.',
    howToReceive:
      'V-dipole 137 МГц горизонтально или QFH. RTL-SDR на 137.9125 МГц, ширина 40 кГц, режим WFM. SatDump pipeline noaa_apt.',
  },
  {
    noradId: 33591, // NOAA 19
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_100_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT analog weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (горизонтально) или QFH',
    satdumpPipeline: 'noaa_apt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Аналоговые APT-снимки облачности в реальном времени — два канала: видимый и инфракрасный. Полоса захвата ~2900 км.',
    howToReceive:
      'V-dipole 137 МГц горизонтально или QFH. RTL-SDR на 137.100 МГц, ширина 40 кГц, режим WFM. SatDump pipeline noaa_apt.',
  },

  // ── NOAA APT (inactive / decommissioned) ───────────────────────────────
  {
    noradId: 26536, // NOAA 16
    status: 'inactive',
    downlinks: [
      {
        frequencyHz: 137_625_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT (decommissioned 2014)',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz',
    satdumpPipeline: 'noaa_apt',
    whatYouReceive: 'Ничего — спутник списан в 2014 году, передатчик выключен.',
    howToReceive: 'Приём невозможен — спутник неактивен.',
    notes: 'Списан 9 июня 2014. Разрушился на орбите 25 ноября 2015.',
  },
  {
    noradId: 27453, // NOAA 17
    status: 'inactive',
    downlinks: [
      {
        frequencyHz: 137_500_000,
        bandwidthHz: 40_000,
        mode: 'APT',
        description: 'VHF APT (decommissioned 2013)',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz',
    satdumpPipeline: 'noaa_apt',
    whatYouReceive: 'Ничего — спутник списан в 2013 году, передатчик выключен.',
    howToReceive: 'Приём невозможен — спутник неактивен.',
    notes: 'Списан 10 апреля 2013 из-за деградации сканера AVHRR.',
  },

  // ── NOAA JPSS (X-band, unavailable for RTL-SDR) ────────────────────────
  {
    noradId: 43013, // NOAA 20 (JPSS-1)
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 7_812_000_000,
        bandwidthHz: 30_000_000,
        mode: 'AHRPT',
        description: 'X-band HRD downlink',
      },
    ],
    difficulty: 'expert',
    antenna: 'Параболическая антенна 1.8 м + X-band LNB',
    whatYouReceive:
      'Высокодетальные снимки с приборов VIIRS, CrIS, ATMS — формат HRD (High Rate Data). Разрешение до 375 м.',
    howToReceive:
      'Для приёма нужна параболическая антенна ~1.8 м, X-band конвертер (7–8 ГГц), специализированный приёмник. RTL-SDR не подходит — частота и ширина полосы за пределами возможностей.',
    notes: 'X-band 7812 МГц. Нужна профессиональная наземная станция.',
  },
  {
    noradId: 54234, // NOAA 21 (JPSS-2)
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 7_812_000_000,
        bandwidthHz: 30_000_000,
        mode: 'AHRPT',
        description: 'X-band HRD downlink',
      },
    ],
    difficulty: 'expert',
    antenna: 'Параболическая антенна 1.8 м + X-band LNB',
    whatYouReceive:
      'Высокодетальные снимки VIIRS, CrIS, ATMS — формат HRD. Аналогичен NOAA 20.',
    howToReceive:
      'Профессиональная наземная станция с X-band антенной. RTL-SDR не подходит.',
    notes: 'X-band 7812 МГц. Запущен 10 ноября 2022.',
  },

  // ── Meteor-M (LRPT) ───────────────────────────────────────────────────
  {
    noradId: 57166, // Meteor-M N2-3
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_900_000,
        bandwidthHz: 150_000,
        mode: 'LRPT',
        description: 'VHF LRPT digital weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (горизонтально) или QFH',
    satdumpPipeline: 'meteor_m2-x_lrpt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Цифровые LRPT-снимки облачности (MSU-MR) — цветные, разрешение 1 км. Качество выше, чем APT у NOAA. Три канала одновременно.',
    howToReceive:
      'V-dipole 137 МГц или QFH. RTL-SDR на 137.9 МГц, ширина 150 кГц. SatDump pipeline meteor_m2-x_lrpt. Сигнал QPSK — требуется хороший SNR (>5 дБ).',
    notes:
      'LRPT иногда отключают для обслуживания. Проверяйте статус на r/amateursatellites.',
  },
  {
    noradId: 59051, // Meteor-M N2-4
    status: 'active',
    downlinks: [
      {
        frequencyHz: 137_100_000,
        bandwidthHz: 150_000,
        mode: 'LRPT',
        description: 'VHF LRPT digital weather imagery',
      },
    ],
    difficulty: 'easy',
    antenna: 'V-dipole 137 MHz (горизонтально) или QFH',
    satdumpPipeline: 'meteor_m2-x_lrpt',
    samplerateHz: 2_400_000,
    whatYouReceive:
      'Цифровые LRPT-снимки облачности (MSU-MR) — цветные, разрешение 1 км, три канала одновременно.',
    howToReceive:
      'V-dipole 137 МГц или QFH. RTL-SDR на 137.1 МГц, ширина 150 кГц. SatDump pipeline meteor_m2-x_lrpt.',
    notes:
      'Запущен 29 февраля 2024. Частота 137.1 МГц совпадает с NOAA 19 APT — возможны наложения при одновременном пролёте.',
  },

  // ── ISS ────────────────────────────────────────────────────────────────
  {
    noradId: 25544, // ISS (ZARYA)
    status: 'intermittent',
    downlinks: [
      {
        frequencyHz: 145_800_000,
        bandwidthHz: 15_000,
        mode: 'SSTV',
        description: 'SSTV (Slow Scan TV) — во время ARISS-событий',
      },
      {
        frequencyHz: 145_825_000,
        bandwidthHz: 15_000,
        mode: 'PACKET',
        description: 'Packet radio AX.25 / APRS digipeater',
      },
    ],
    difficulty: 'easy',
    antenna: 'Любая антенна на 2 метра (даже штыревая)',
    whatYouReceive:
      'SSTV-снимки в режиме PD120/PD180 во время специальных сессий (ARISS-события, несколько раз в год). Packet radio AX.25 на 145.825 МГц работает чаще.',
    howToReceive:
      'Любая антенна 144 МГц. RTL-SDR на 145.800 МГц, NFM, ширина 15 кГц. Доплер ±3.5 кГц — может потребоваться ручная подстройка. Декодер SSTV: MMSSTV, QSSTV или Robot36 (Android).',
    notes:
      'SSTV включают во время специальных событий — следите за расписанием ARISS. Packet/APRS на 145.825 работает постоянно.',
  },

  // ── Amateur satellites ─────────────────────────────────────────────────
  {
    noradId: 43017, // AO-91 (RadFxSat / Fox-1B)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 145_960_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'FM voice repeater downlink',
      },
    ],
    difficulty: 'medium',
    antenna: 'Yagi 2 метра или Arrow II',
    whatYouReceive:
      'FM-голосовой ретранслятор — можно слушать QSO радиолюбителей через спутник в реальном времени. Uplink 435.250 МГц (67 Гц CTCSS).',
    howToReceive:
      'Направленная антенна 144 МГц (Yagi, Arrow II). RTL-SDR на 145.960 МГц, NFM, ширина 12 кГц. Доплер ±3 кГц. Для передачи нужна радиолюбительская лицензия.',
    notes:
      'Fox-1B. Активируется по свету (солнечные панели). В тени Земли может быть отключён.',
  },
  {
    noradId: 27607, // SO-50 (SaudiSat-1C)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 436_795_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'UHF FM voice repeater downlink',
      },
    ],
    difficulty: 'medium',
    antenna: 'Yagi 70 см или Arrow II dual-band',
    whatYouReceive:
      'FM-голосовой ретранслятор на UHF — можно слушать QSO через спутник. Uplink 145.850 МГц (67 Гц CTCSS, 74.4 Гц для активации).',
    howToReceive:
      'Направленная антенна 430 МГц (Yagi 70 см). RTL-SDR на 436.795 МГц, NFM. Доплер ±10 кГц на UHF — существенный, нужна подстройка.',
    notes:
      'Один из старейших любительских спутников (2002). Для активации нужен тон 74.4 Гц на 2 секунды перед использованием.',
  },
  {
    noradId: 39444, // AO-73 (FUNcube-1)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 145_935_000,
        bandwidthHz: 20_000,
        mode: 'BPSK',
        description: 'BPSK telemetry 1200 bps',
      },
    ],
    difficulty: 'medium',
    antenna: 'Yagi 2 метра или QFH 145 МГц',
    whatYouReceive:
      'BPSK телеметрия 1200 бод — данные о состоянии спутника, температуры, напряжения, научные данные. Также линейный транспондер SSB/CW (29.4–29.5 / 145.95–145.97 МГц).',
    howToReceive:
      'Антенна 144 МГц. RTL-SDR на 145.935 МГц, USB, ширина 20 кГц. Декодер: FUNcube Dashboard (бесплатный). Телеметрия автоматически отправляется в Data Warehouse.',
    notes:
      'В автономном режиме передаёт телеметрию. Когда оператор активирует транспондер — переключается в режим SSB/CW.',
  },
  {
    noradId: 43700, // QO-100 (Es\'hail-2)
    status: 'active',
    downlinks: [
      {
        frequencyHz: 10_489_750_000,
        bandwidthHz: 500_000,
        mode: 'SSB_LINEAR',
        description: 'Narrowband transponder (SSB/CW)',
      },
    ],
    difficulty: 'hard',
    antenna: 'Параболическая антенна 60–80 см + PLL LNB',
    whatYouReceive:
      'Любительский SSB/CW транспондер на геостационаре (25.9°E) — можно слушать QSO радиолюбителей из Европы, Африки и Ближнего Востока 24/7. Не зависит от пролётов.',
    howToReceive:
      'Параболическая антенна 60–80 см с PLL LNB на 10489.5–10490 МГц. Bias-tee для питания LNB + RTL-SDR. IF ~739 МГц. SDR# или GQRX, режим USB.',
    notes:
      'Геостационарный — виден постоянно, не нужно ждать пролёт. Из Батуми elevation ~37° — приём возможен. Нужна точная юстировка LNB (линейная поляризация).',
  },
  {
    noradId: 43803, // JY1SAT (JO-97)
    status: 'intermittent',
    downlinks: [
      {
        frequencyHz: 145_840_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'FM voice transponder / SSDV downlink',
      },
    ],
    difficulty: 'medium',
    antenna: 'Yagi 2 метра',
    whatYouReceive:
      'FM-голосовой ретранслятор и SSDV-изображения с камеры спутника. Первый иорданский спутник.',
    howToReceive:
      'Направленная антенна 144 МГц. RTL-SDR на 145.840 МГц, NFM. SSDV декодируется специальным ПО.',
    notes:
      'Работает нестабильно — может быть неактивен длительное время.',
  },
  {
    noradId: 40908, // LilacSat-2 (CAS-3H)
    status: 'inactive',
    downlinks: [
      {
        frequencyHz: 437_200_000,
        bandwidthHz: 15_000,
        mode: 'FM_VOICE',
        description: 'UHF FM voice transponder',
      },
    ],
    difficulty: 'medium',
    antenna: 'Yagi 70 см',
    whatYouReceive:
      'Ничего — спутник предположительно неактивен (запущен 2015).',
    howToReceive: 'Приём маловероятен — спутник давно не отвечает.',
    notes: 'CAS-3H. Запущен в 2015, ожидаемый срок жизни 1–2 года.',
  },

  // ── MetOp (L-band AHRPT) ──────────────────────────────────────────────
  {
    noradId: 38771, // MetOp-B
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_701_300_000,
        bandwidthHz: 4_500_000,
        mode: 'AHRPT',
        description: 'L-band AHRPT digital imagery',
      },
    ],
    difficulty: 'hard',
    antenna: 'Параболическая антенна 80–120 см + L-band LNA + feed',
    satdumpPipeline: 'metop_ahrpt',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'Высокодетальные цифровые снимки AVHRR/3 — 6 каналов, разрешение 1 км. Плюс данные IASI, MHS, AMSU.',
    howToReceive:
      'Параболическая антенна 80+ см с L-band patch feed. SAWbird+ GOES LNA. RTL-SDR с bias-tee на 1701.3 МГц, samplerate 6 MSPS. SatDump pipeline metop_ahrpt.',
    notes:
      'L-band 1701.3 МГц. Нужна моторизованная или ручная трассировка антенны.',
  },
  {
    noradId: 43689, // MetOp-C
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_701_300_000,
        bandwidthHz: 4_500_000,
        mode: 'AHRPT',
        description: 'L-band AHRPT digital imagery',
      },
    ],
    difficulty: 'hard',
    antenna: 'Параболическая антенна 80–120 см + L-band LNA + feed',
    satdumpPipeline: 'metop_ahrpt',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'Высокодетальные цифровые снимки AVHRR/3 — 6 каналов, разрешение 1 км.',
    howToReceive:
      'Аналогично MetOp-B: параболическая антенна 80+ см, L-band LNA, RTL-SDR с bias-tee, SatDump metop_ahrpt.',
    notes: 'L-band 1701.3 МГц. Запущен 7 ноября 2018.',
  },

  // ── GOES (L-band HRIT/EMWIN) ──────────────────────────────────────────
  {
    noradId: 41866, // GOES-16
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_694_100_000,
        bandwidthHz: 2_400_000,
        mode: 'HRIT',
        description: 'L-band HRIT/EMWIN downlink',
      },
    ],
    difficulty: 'hard',
    antenna: 'Параболическая антенна 100+ см + SAWbird+ GOES LNA',
    satdumpPipeline: 'goes_hrit',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'Полнодисковые снимки Земли с геостационара каждые 10 минут — видимый, ИК, водяной пар. Также данные EMWIN (погодные предупреждения).',
    howToReceive:
      'Параболическая антенна 1 м+, SAWbird+ GOES LNA, RTL-SDR с bias-tee. Антенна направлена на фиксированную точку (геостационар). SatDump pipeline goes_hrit.',
    notes:
      'Геостационарный (75.2°W) — из Батуми не виден (ниже горизонта). Актуально для Америки.',
  },
  {
    noradId: 43226, // GOES-17
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_694_100_000,
        bandwidthHz: 2_400_000,
        mode: 'HRIT',
        description: 'L-band HRIT/EMWIN downlink',
      },
    ],
    difficulty: 'hard',
    antenna: 'Параболическая антенна 100+ см + SAWbird+ GOES LNA',
    satdumpPipeline: 'goes_hrit',
    samplerateHz: 6_000_000,
    whatYouReceive: 'Аналогичен GOES-16 — полнодисковые геостационарные снимки.',
    howToReceive: 'Аналогично GOES-16. Фиксированная антенна на геостационар.',
    notes:
      'Геостационарный (137.2°W) — из Батуми не виден. На орбитальном хранении с 2023.',
  },
  {
    noradId: 51850, // GOES-18
    status: 'active',
    downlinks: [
      {
        frequencyHz: 1_694_100_000,
        bandwidthHz: 2_400_000,
        mode: 'HRIT',
        description: 'L-band HRIT/EMWIN downlink',
      },
    ],
    difficulty: 'hard',
    antenna: 'Параболическая антенна 100+ см + SAWbird+ GOES LNA',
    satdumpPipeline: 'goes_hrit',
    samplerateHz: 6_000_000,
    whatYouReceive:
      'Полнодисковые снимки Земли каждые 10 минут (замена GOES-17).',
    howToReceive: 'Аналогично GOES-16. Фиксированная антенна на геостационар.',
    notes: 'Геостационарный (136.9°W) — из Батуми не виден.',
  },
];

// ---------------------------------------------------------------------------
// Group-level generic profiles (for constellations with many satellites)
// ---------------------------------------------------------------------------

const GROUP_PROFILES: Record<string, Omit<RadioProfile, 'noradId'>> = {
  'gps-ops': {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_575_420_000,
        bandwidthHz: 2_000_000,
        mode: 'BEACON',
        description: 'L1 C/A navigation signal (1575.42 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'Патч-антенна GPS L1 + LNA + фильтр',
    whatYouReceive:
      'Навигационный сигнал GPS L1 — псевдослучайный код и навигационное сообщение. Можно декодировать эфемериды, альманах, время UTC.',
    howToReceive:
      'Патч-антенна L1 1575.42 МГц + LNA + SAW-фильтр. RTL-SDR может принять сигнал (ниже уровня шума), но для декодирования нужен специализированный софт (gnss-sdr, GNSS-SDR). Это экспертный уровень.',
    notes:
      'Сигнал GPS ниже уровня шума (~-130 дБм). Для декодирования используется корреляция с известным PRN-кодом.',
  },
  'glo-ops': {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_602_000_000,
        bandwidthHz: 8_000_000,
        mode: 'BEACON',
        description: 'L1 FDMA navigation signal (~1602 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'Патч-антенна GLONASS L1 + LNA',
    whatYouReceive:
      'Навигационный сигнал ГЛОНАСС L1 — FDMA, каждый спутник на своей частоте (1598.0625–1605.375 МГц).',
    howToReceive:
      'Аналогично GPS — патч-антенна, LNA, GNSS-SDR. Уникальная особенность: FDMA вместо CDMA, разные частоты для разных спутников.',
    notes:
      'FDMA: частота = 1602 + k×0.5625 МГц, где k — номер частотного канала спутника.',
  },
  galileo: {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_575_420_000,
        bandwidthHz: 4_000_000,
        mode: 'BEACON',
        description: 'E1 navigation signal (1575.42 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'Патч-антенна L1 + LNA',
    whatYouReceive:
      'Навигационный сигнал Galileo E1 — CBOC модуляция. Совместим с GPS L1 по частоте.',
    howToReceive:
      'Та же антенна, что для GPS L1. GNSS-SDR поддерживает Galileo E1. Более сложная модуляция (CBOC), чем GPS.',
    notes: 'Европейская навигационная система. Полная группировка — 30 спутников.',
  },
  beidou: {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 1_561_098_000,
        bandwidthHz: 4_000_000,
        mode: 'BEACON',
        description: 'B1I navigation signal (1561.098 MHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'Патч-антенна L-band + LNA',
    whatYouReceive:
      'Навигационный сигнал BeiDou B1I — BPSK модуляция. Китайская навигационная система.',
    howToReceive:
      'Патч-антенна L-band + LNA. GNSS-SDR поддерживает BeiDou B1I. Нужен широкополосный фронтенд.',
    notes: 'Китайская система. 35+ спутников (MEO + GEO + IGSO).',
  },
  starlink: {
    status: 'unavailable_for_rtlsdr',
    downlinks: [
      {
        frequencyHz: 11_325_000_000,
        bandwidthHz: 250_000_000,
        mode: 'BEACON',
        description: 'Ku-band user downlink (~11 GHz)',
      },
    ],
    difficulty: 'expert',
    antenna: 'Фазированная решётка Starlink (проприетарная)',
    whatYouReceive:
      'Широкополосный интернет-трафик Ku-band. Зашифрован, проприетарный протокол — полезного для радиолюбителя ничего.',
    howToReceive:
      'Невозможно на RTL-SDR. Ku-band 10.7–12.7 ГГц требует фазированной решётки с beam forming. Протокол проприетарный.',
    notes: 'Starlink — коммерческая система SpaceX. Приём на любительском оборудовании невозможен.',
  },
};

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------

const profileMap = new Map<number, RadioProfile>();
for (const p of PROFILES) {
  profileMap.set(p.noradId, p);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getRadioProfile(noradId: number): RadioProfile | undefined {
  return profileMap.get(noradId);
}

export function getGroupRadioProfile(
  group: string,
): Omit<RadioProfile, 'noradId'> | undefined {
  return GROUP_PROFILES[group];
}

export function isReceivable(noradId: number): boolean {
  const p = profileMap.get(noradId);
  if (!p) return false;
  return p.status === 'active' || p.status === 'intermittent';
}

export function getModeColor(mode: RadioMode): string {
  switch (mode) {
    case 'APT':
      return 'bg-green-500/20 text-green-300 border border-green-500/30';
    case 'LRPT':
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case 'FM_VOICE':
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    case 'SSTV':
      return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    case 'SSB_LINEAR':
      return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
    case 'HRIT':
    case 'AHRPT':
      return 'bg-teal-500/20 text-teal-300 border border-teal-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
  }
}

export function getStatusColor(status: RadioStatus): string {
  switch (status) {
    case 'active':
      return 'text-green-400';
    case 'inactive':
      return 'text-red-400';
    case 'intermittent':
      return 'text-yellow-400';
    case 'unavailable_for_rtlsdr':
      return 'text-gray-500';
  }
}

export function getDifficultyLabel(d: Difficulty): string {
  switch (d) {
    case 'easy':
      return 'Easy';
    case 'medium':
      return 'Medium';
    case 'hard':
      return 'Hard';
    case 'expert':
      return 'Expert';
  }
}

export function getDifficultyColor(d: Difficulty): string {
  switch (d) {
    case 'easy':
      return 'text-green-400';
    case 'medium':
      return 'text-yellow-400';
    case 'hard':
      return 'text-orange-400';
    case 'expert':
      return 'text-red-400';
  }
}

function getBandLabel(frequencyHz: number): string {
  if (frequencyHz >= 10_000_000_000) return 'Ku-band';
  if (frequencyHz >= 7_000_000_000) return 'X-band';
  if (frequencyHz >= 1_000_000_000) return 'L-band';
  if (frequencyHz >= 400_000_000) return 'UHF';
  return 'VHF';
}

export function getUnavailableBandLabel(profile: RadioProfile): string {
  if (profile.downlinks.length === 0) return 'N/A';
  return getBandLabel(profile.downlinks[0].frequencyHz);
}
