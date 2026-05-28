import { inpostApiResponseSchema } from "../src/integrations/inpost/inpost.zod";

async function test() {
  const url = `https://api-pl-points.easypack24.net/v1/points?city=Krak%C3%B3w&per_page=1000`;
  const res = await fetch(url);
  const json = await res.json();
  const parsed = inpostApiResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error(parsed.error);
  } else {
    console.log("Success! Items:", parsed.data.items.length);
  }
}
test();
