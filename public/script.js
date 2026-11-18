(() => {
  "use strict";

  const chatBox = document.getElementById("chatBox");
  const chatForm = document.getElementById("chatForm");
  const msgInput = document.getElementById("msgInput");
  const sendBtn = document.getElementById("sendBtn");

  // Riwayat pesan untuk dikirim ke API
  const history = [];

  // Tambahkan system prompt
  history.push({
    role: "system",
    content:
      "Anda adalah Nusa AI, asisten percakapan ramah yang menjawab dalam Bahasa Indonesia. Jawab dengan ringkas dan jelas.",
  });

  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.textContent = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
  }

  function removeWelcome() {
    const welcome = chatBox.querySelector(".welcome-msg");
    if (welcome) welcome.remove();
  }

  async function sendMessage(text) {
    removeWelcome();

    // Tampilkan pesan user
    addMessage("user", text);
    history.push({ role: "user", content: text });

    // Tampilkan indikator typing
    const botDiv = addMessage("bot", "Mengetik...");
    botDiv.classList.add("typing");

    sendBtn.disabled = true;
    msgInput.disabled = true;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: history }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Baca streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botText = "";
      let buffer = "";

      botDiv.classList.remove("typing");
      botDiv.textContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const content = JSON.parse(data);
            botText += content;
            botDiv.textContent = botText;
            chatBox.scrollTop = chatBox.scrollHeight;
          } catch (e) {
            // skip parse errors
          }
        }
      }

      // Simpan jawaban bot ke history
      if (botText) {
        history.push({ role: "assistant", content: botText });
      } else {
        botDiv.textContent = "Tidak ada jawaban dari server.";
      }
    } catch (err) {
      botDiv.classList.remove("typing");
      botDiv.textContent = `Error: ${err.message}`;
    } finally {
      sendBtn.disabled = false;
      msgInput.disabled = false;
      msgInput.focus();
    }
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;
    msgInput.value = "";
    sendMessage(text);
  });
})();
