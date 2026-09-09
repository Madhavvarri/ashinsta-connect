/**
 * Demo Mode sample data. Everything here is clearly simulated — nothing
 * contacts Instagram.
 */

export const DEMO_ACCOUNT = {
  instagram_user_id: "demo_17841400000000000",
  username: "ashinsta.demo",
  profile_picture: null as string | null,
};

export const SAMPLE_COMMENTS: { username: string; text: string; post: string }[] = [
  { username: "maya.k", text: "Can you tell me the price?", post: "demo_post_01" },
  { username: "joe_fit", text: "Do you ship to Canada?", post: "demo_post_01" },
  { username: "lena.arts", text: "This is gorgeous 😍", post: "demo_post_02" },
  { username: "theo.frame", text: "What sizes are available?", post: "demo_post_02" },
  { username: "sam_runs", text: "PRICE please!!", post: "demo_post_03" },
  { username: "nina.codes", text: "How do I order one?", post: "demo_post_03" },
  { username: "dev.ash", text: "Is there a discount code?", post: "demo_post_04" },
  { username: "carla.m", text: "Shipping time to the UK?", post: "demo_post_04" },
];

export const SAMPLE_RULES = [
  {
    keyword: "price",
    match_type: "contains",
    reply_message: "Thanks for your interest! Please check our profile link for full pricing details.",
    case_sensitive: false,
    cooldown_minutes: 0,
    is_active: true,
  },
  {
    keyword: "ship",
    match_type: "contains",
    reply_message: "We ship worldwide! Delivery usually takes 5–10 business days. DM us for details.",
    case_sensitive: false,
    cooldown_minutes: 5,
    is_active: true,
  },
  {
    keyword: "size",
    match_type: "contains",
    reply_message: "We offer sizes XS–XXL. The full size chart is in our bio!",
    case_sensitive: false,
    cooldown_minutes: 0,
    is_active: true,
  },
] as const;

export function demoCommentId() {
  return `demo_c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
