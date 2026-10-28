import type Ionicons from "@expo/vector-icons/Ionicons";

export type Offer = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
  tag_en: string;
  tag_ar: string;
  title_en: string;
  title_ar: string;
  sub_en: string;
  sub_ar: string;
  /** Lowercase English category name the offer opens in the menu. Leave out to open the full menu. */
  category?: string;
  /** Where signed-out customers go instead of the menu, e.g. to sign in. */
  guestRoute?: "/profile";
  cta_en: string;
  cta_ar: string;
};

/**
 * Home banner content. These are hooks, not price promises: none of them states a discount.
 * Replace with real campaigns (and real promo codes from the admin) before launch.
 */
export const offers: Offer[] = [
  {
    id: "double",
    icon: "flame",
    bg: "#F15A24",
    fg: "#FFFFFF",
    tag_en: "HOT RIGHT NOW",
    tag_ar: "الأكثر طلبا",
    title_en: "Double smash.\nDouble trouble.",
    title_ar: "دبل سماش.\nدبل متعة.",
    sub_en: "Two crispy-edged patties, one serious craving.",
    sub_ar: "قرصتين مقرمشتين لأجمل جوع.",
    category: "burgers",
    cta_en: "Order now",
    cta_ar: "اطلب الآن",
  },
  {
    id: "summer",
    icon: "sunny",
    bg: "#FF7A59",
    fg: "#FFFFFF",
    tag_en: "SUMMER SPECIALS",
    tag_ar: "عروض الصيف",
    title_en: "Cool down.\nSip something wild.",
    title_ar: "برّد نفسك.\nجرب مشروب مختلف.",
    sub_en: "Cloud Matcha, Pink Lemonade, Berry Volt and more.",
    sub_ar: "كلاود ماتشا، بينك ليمونيد، بيري فولت وأكتر.",
    category: "rvrs summer specials",
    cta_en: "Explore drinks",
    cta_ar: "اكتشف المشروبات",
  },
  {
    id: "pickup",
    icon: "flash",
    bg: "#FFD52A",
    fg: "#17130F",
    tag_en: "SKIP THE LINE",
    tag_ar: "بدون انتظار",
    title_en: "Order ahead.\nWalk in. Eat.",
    title_ar: "اطلب قبلها.\nادخل وخد طلبك.",
    sub_en: "Pickup orders are ready when you arrive.",
    sub_ar: "طلبات الاستلام جاهزة لما توصل.",
    cta_en: "Order pickup",
    cta_ar: "اطلب للاستلام",
  },
  {
    id: "smash",
    icon: "restaurant",
    bg: "#17130F",
    fg: "#FBF7F1",
    tag_en: "SMASH BURGERS",
    tag_ar: "سماش برجر",
    title_en: "Smashed hard.\nSeared right.",
    title_ar: "سماش بحرفنة.\nمشوي صح.",
    sub_en: "Crispy edges, juicy centre. Pick your favourite burger.",
    sub_ar: "أطراف مقرمشة وقلب طري. اختر برجرك المفضل.",
    category: "burgers",
    cta_en: "See burgers",
    cta_ar: "شاهد البرجر",
  },
];
