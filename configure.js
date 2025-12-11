document.addEventListener("DOMContentLoaded", () => {
  const optionsContainer = document.getElementById("optionsContainer");
  const addOptionButton = document.getElementById("addOptionButton");
  const saveConfigButton = document.getElementById("saveConfigButton");
  const contextInput = document.getElementById("contextModel");

  function getLetterForIndex(index) {
    return String.fromCharCode("A".charCodeAt(0) + index);
  }

  function updateRemoveButtons() {
    const removeButtons = optionsContainer.querySelectorAll(".remove-option-button");
    const shouldDisable = removeButtons.length === 1;
    removeButtons.forEach((button) => {
      button.disabled = shouldDisable;
    });
  }

  function relabelOptions() {
    const cards = optionsContainer.querySelectorAll(".option-card");
    cards.forEach((card, index) => {
      const letter = getLetterForIndex(index);
      card.dataset.letter = letter;
      const labelEl = card.querySelector(".option-label");
      if (labelEl) {
        labelEl.textContent = `Option ${letter}`;
      }
    });
    updateRemoveButtons();
  }

  function createOptionCard() {
    const card = document.createElement("div");
    card.className = "option-card";

    const header = document.createElement("div");
    header.className = "option-card-header";

    const label = document.createElement("span");
    label.className = "option-label";
    label.textContent = "Option";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-option-button";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      card.remove();
      relabelOptions();
    });

    header.appendChild(label);
    header.appendChild(removeButton);

    const body = document.createElement("div");
    body.className = "option-card-body";

    const nameField = document.createElement("div");
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Display name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "option-name-input";
    nameInput.placeholder = "e.g. Courtyard";
    nameField.appendChild(nameLabel);
    nameField.appendChild(nameInput);

    const modelField = document.createElement("div");
    const modelLabel = document.createElement("label");
    modelLabel.textContent = "Model (GLB / GLTF)";
    const modelInput = document.createElement("input");
    modelInput.type = "file";
    modelInput.className = "option-model-input";
    modelInput.accept = ".glb,.gltf";
    modelField.appendChild(modelLabel);
    modelField.appendChild(modelInput);

    const metricsField = document.createElement("div");
    const metricsLabel = document.createElement("label");
    metricsLabel.textContent = "Metrics JSON";
    const metricsInput = document.createElement("input");
    metricsInput.type = "file";
    metricsInput.className = "option-metrics-input";
    metricsInput.accept = ".json";
    metricsField.appendChild(metricsLabel);
    metricsField.appendChild(metricsInput);

    body.appendChild(nameField);
    body.appendChild(modelField);
    body.appendChild(metricsField);

    card.appendChild(header);
    card.appendChild(body);

    optionsContainer.appendChild(card);
    relabelOptions();
  }

  function collectConfig() {
    const contextFile = contextInput.files && contextInput.files[0];
    const cards = optionsContainer.querySelectorAll(".option-card");
    const options = Array.from(cards).map((card) => {
      const letter = card.dataset.letter || "A";
      const displayNameInput = card.querySelector(".option-name-input");
      const modelInput = card.querySelector(".option-model-input");
      const metricsInput = card.querySelector(".option-metrics-input");

      return {
        id: letter,
        label: `Option ${letter}`,
        displayName: displayNameInput?.value.trim() || "",
        modelFileName: modelInput?.files[0]?.name || null,
        metricsFileName: metricsInput?.files[0]?.name || null
      };
    });

    return {
      contextModelName: contextFile ? contextFile.name : null,
      options
    };
  }

  addOptionButton.addEventListener("click", () => {
    createOptionCard();
  });

  saveConfigButton.addEventListener("click", () => {
    const config = collectConfig();
    localStorage.setItem("talvexConfig", JSON.stringify(config));
    window.location.href = "index.html";
  });

  createOptionCard();

  // --- About modal wiring (same behaviour as main page) --------------------
  const aboutButton = document.getElementById("aboutButton");
  const overlay = document.getElementById("aboutOverlay");
  const closeButton = document.getElementById("aboutCloseButton");

  if (aboutButton && overlay && closeButton) {
    function openAbout() {
      overlay.classList.add("is-visible");
      overlay.setAttribute("aria-hidden", "false");
    }

    function closeAbout() {
      overlay.classList.remove("is-visible");
      overlay.setAttribute("aria-hidden", "true");
    }

    aboutButton.addEventListener("click", openAbout);
    closeButton.addEventListener("click", closeAbout);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeAbout();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeAbout();
      }
    });
  }
});
