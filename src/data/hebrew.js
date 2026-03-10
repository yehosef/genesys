export const HEBREW = 'אבגדהוזחטיכלמנסעפצקרשתךםןףץ';
export const DEFAULT_LETTERS = [...HEBREW];
export const HEBREW_22 = [...'אבגדהוזחטיכלמנסעפצקרשת'];

export const FINAL_TO_BASE = { 'ך':'כ', 'ם':'מ', 'ן':'נ', 'ף':'פ', 'ץ':'צ' };

export const EN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#';
export const HEBREW_TO_EN = {};
export const EN_TO_HEBREW = {};
[...HEBREW].forEach((h, i) => {
  HEBREW_TO_EN[h] = EN_CHARS[i];
  EN_TO_HEBREW[EN_CHARS[i]] = h;
});

export const GEMATRIA = {
  'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,
  'י':10,'כ':20,'ל':30,'מ':40,'נ':50,'ס':60,'ע':70,'פ':80,'צ':90,
  'ק':100,'ר':200,'ש':300,'ת':400,
  'ך':500,'ם':600,'ן':700,'ף':800,'ץ':900
};
