/** Typed tool surface; no supplier listings are synthesized. */
export {
  create_event_plan,
  calculate_budget,
  rebalance_budget,
  generate_timeline,
  generate_tasks,
  recommend_services,
  generate_event_ideas,
  identify_risks,
  update_event_plan,
} from "../engines";
export { extract_event_details } from "../agent/extract";
export { get_event_state, update_event_state } from "../db/events";
export interface VendorSearchResult {
  name: string;
  sourceUrl: string;
  location: string;
  category: string;
}
export interface VendorSearchProvider {
  search(query: {
    location: string;
    category: string;
    guestCount: number;
  }): Promise<VendorSearchResult[]>;
}
export async function search_vendors(
  query: { location: string; category: string; guestCount: number },
  provider?: VendorSearchProvider,
) {
  if (!provider)
    return {
      available: false,
      results: [] as VendorSearchResult[],
      message:
        "No supplier search provider is configured. Collect verified quotes using the checklist.",
    };
  return {
    available: true,
    results: await provider.search(query),
    message: "Verify availability and pricing with each supplier.",
  };
}
