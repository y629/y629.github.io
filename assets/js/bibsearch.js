import { highlightSearchTerm } from "./highlight-search-term.js";

document.addEventListener("DOMContentLoaded", function () {
  const selected = { topic: new Set(), type: new Set(), year: new Set() };

  const entryRow = (li) => li.querySelector(":scope > .row");

  const matchesChipFilters = (li) => {
    const row = entryRow(li);
    if (!row) return true;

    if (selected.topic.size > 0) {
      const topics = (row.dataset.pubTopics || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (!topics.some((t) => selected.topic.has(t))) return false;
    }

    if (selected.type.size > 0 && !selected.type.has(row.dataset.pubType)) return false;

    if (selected.year.size > 0 && !selected.year.has(row.dataset.pubYear)) return false;

    return true;
  };

  // actual bibsearch logic
  const filterItems = (searchTerm) => {
    document.querySelectorAll(".bibliography, .unloaded").forEach((element) => element.classList.remove("unloaded"));

    // highlight-search-term
    if (CSS.highlights) {
      const nonMatchingElements = highlightSearchTerm({ search: searchTerm, selector: ".bibliography > li" }) || [];
      nonMatchingElements.forEach((element) => {
        element.classList.add("unloaded");
      });
    } else if (searchTerm) {
      // Simply add unloaded class to all non-matching items if Browser does not support CSS highlights
      document.querySelectorAll(".bibliography > li").forEach((element) => {
        const text = element.innerText.toLowerCase();
        if (text.indexOf(searchTerm) == -1) {
          element.classList.add("unloaded");
        }
      });
    }

    // chip-based filters (topic / type / year)
    document.querySelectorAll(".bibliography > li").forEach((li) => {
      if (!matchesChipFilters(li)) {
        li.classList.add("unloaded");
      }
    });

    document.querySelectorAll("h2.bibliography").forEach(function (element) {
      let iterator = element.nextElementSibling; // get next sibling element after h2, which can be h3 or ol
      let hideFirstGroupingElement = true;
      // iterate until next group element (h2), which is already selected by the querySelectorAll(-).forEach(-)
      while (iterator && iterator.tagName !== "H2") {
        if (iterator.tagName === "OL") {
          const ol = iterator;
          const unloadedSiblings = ol.querySelectorAll(":scope > li.unloaded");
          const totalSiblings = ol.querySelectorAll(":scope > li");

          if (unloadedSiblings.length === totalSiblings.length) {
            ol.previousElementSibling.classList.add("unloaded"); // Add the '.unloaded' class to the previous grouping element (e.g. year)
            ol.classList.add("unloaded"); // Add the '.unloaded' class to the OL itself
          } else {
            hideFirstGroupingElement = false; // there is at least some visible entry, don't hide the first grouping element
          }
        }
        iterator = iterator.nextElementSibling;
      }
      // Add unloaded class to first grouping element (e.g. year) if no item left in this group
      if (hideFirstGroupingElement) {
        element.classList.add("unloaded");
      }
    });
  };

  const applyFilters = () => {
    const searchTerm = document.getElementById("bibsearch").value.toLowerCase();
    filterItems(searchTerm);
  };

  const buildFilterChips = () => {
    const container = document.getElementById("bib-filters");
    if (!container) return;

    const topics = new Set();
    const types = new Set();
    const years = new Set();

    document.querySelectorAll(".bibliography > li > .row").forEach((row) => {
      (row.dataset.pubTopics || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => topics.add(t));
      if (row.dataset.pubType) types.add(row.dataset.pubType);
      if (row.dataset.pubYear) years.add(row.dataset.pubYear);
    });

    const typeLabels = {
      conference: container.dataset.labelConference || "Conference",
      journal: container.dataset.labelJournal || "Journal",
    };

    const buildGroup = (title, values, kind, labelFn) => {
      if (values.length === 0) return;

      const group = document.createElement("div");
      group.className = "bib-filter-group";

      const heading = document.createElement("span");
      heading.className = "bib-filter-group-label";
      heading.textContent = title;
      group.appendChild(heading);

      values.forEach((value) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "bib-filter-chip";
        chip.textContent = labelFn ? labelFn(value) : value;
        chip.addEventListener("click", () => {
          if (selected[kind].has(value)) {
            selected[kind].delete(value);
            chip.classList.remove("active");
          } else {
            selected[kind].add(value);
            chip.classList.add("active");
          }
          applyFilters();
        });
        group.appendChild(chip);
      });

      container.appendChild(group);
    };

    buildGroup(container.dataset.labelTopic || "Topic", Array.from(topics).sort(), "topic");
    buildGroup(
      container.dataset.labelType || "Type",
      Array.from(types).sort(),
      "type",
      (value) => typeLabels[value] || value,
    );
    buildGroup(container.dataset.labelYear || "Year", Array.from(years).sort().reverse(), "year");
  };

  const updateInputField = () => {
    const hashValue = decodeURIComponent(window.location.hash.substring(1)); // Remove the '#' character
    document.getElementById("bibsearch").value = hashValue;
    filterItems(hashValue.toLowerCase());
  };

  buildFilterChips();

  // Sensitive search. Only start searching if there's been no input for 300 ms
  let timeoutId;
  document.getElementById("bibsearch").addEventListener("input", function () {
    clearTimeout(timeoutId); // Clear the previous timeout
    timeoutId = setTimeout(applyFilters, 300);
  });

  window.addEventListener("hashchange", updateInputField); // Update the filter when the hash changes

  updateInputField(); // Update filter when page loads
});
