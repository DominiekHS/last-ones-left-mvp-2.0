import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Groningen from "@/pages/Groningen";

const { from, useActiveDeals } = vi.hoisted(() => ({
  from: vi.fn(),
  useActiveDeals: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
vi.mock("@/hooks/useDeals", () => ({ useActiveDeals }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("Groningen is informatie zonder actueel dealaanbod op te halen", () => {
  render(<MemoryRouter><Groningen /></MemoryRouter>);
  expect(useActiveDeals).not.toHaveBeenCalled();
  expect(from).not.toHaveBeenCalled();
});