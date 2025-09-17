document.getElementById('llmForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const input = document.getElementById('userInput').value;
 
  const responseDiv = document.getElementById('response');
  responseDiv.innerHTML = "Loading...";
 
  try {
    const res = await fetch('http://localhost:3000/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg: input, sessionId: '123sadasd' })
    });

    const data = await res.json();
    responseDiv.innerHTML = `<strong>Response:</strong> ${data.reply}`;
  } catch (err) {
    responseDiv.innerHTML = "Error: " + err.message;
  }
});