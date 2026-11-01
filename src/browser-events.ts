import { run } from "./core.js";

interface PageRuntimeData {
  logic: string;
}

const dataElement = document.getElementById("oru-page-data");
if (!dataElement?.textContent) {
  throw new Error("ORU page runtime data is missing.");
}

const data = JSON.parse(dataElement.textContent) as PageRuntimeData;
const program = run(data.logic, {
  output: value => console.log(value)
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-oru-handler]")) {
  button.addEventListener("click", () => {
    const handler = button.dataset.oruHandler;
    if (!handler) return;
    try {
      program.call(handler);
    } catch (error) {
      console.error("ORU click handler failed:", error);
    }
  });
}
