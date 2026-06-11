import raw from "./data.generated.json";
import type { PortfolioData } from "./types";

export const data = raw as unknown as PortfolioData;
