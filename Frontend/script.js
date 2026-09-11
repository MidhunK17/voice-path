let selectedLanguage = "en-IN";

function setLanguage(language) {

    selectedLanguage = language;

    const names = {
        "ta-IN": "Tamil",
        "hi-IN": "Hindi",
        "en-IN": "English"
    };

    document.getElementById("status").innerText =
        names[language] + " selected. Click Start Speaking.";
}

function startListening() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    const status = document.getElementById("status");
    const transcriptBox = document.getElementById("transcript");

    if (!SpeechRecognition) {

        status.innerText =
            "Speech recognition is not supported in this browser.";

        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = selectedLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = function () {

        status.innerText =
            "Listening... Speak now.";

        transcriptBox.innerText = "";
    };

    recognition.onresult = function (event) {

        const transcript =
            event.results[0][0].transcript;

        transcriptBox.innerText =
            transcript;

        status.innerText =
            "Speech captured successfully.";

        document.getElementById("analyzeButton").disabled =
            false;
    };

    recognition.onerror = function (event) {

        status.innerText =
            "Speech error: " + event.error;
    };

    recognition.onend = function () {

        console.log("Speech recognition ended.");
    };

    try {

        recognition.start();

    } catch (error) {

        status.innerText =
            "Could not start speech recognition.";
    }
}

async function analyzeSkills() {
    console.log("Analyze Button Clicked");
    console.log("Sending request to backend...");

    const transcript =
        document.getElementById("transcript").textContent.trim();

    const results =
        document.getElementById("results");

    if (!transcript) {

        results.innerHTML =
            "<p>Please speak something first.</p>";

        return;
    }

    results.innerHTML =
        "<p>Analyzing your skills...</p>";

    try {
        console.log("Sending request to backend...");
        const response = await fetch(
            "http://localhost:5000/analyze",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    transcript: transcript,
                    language: selectedLanguage
                })
            }
        );
        console.log("Backend response received",response.status);

        const data = await response.json();
        console.log("Backend data:",data);

        if (!response.ok) {

            throw new Error(
                data.error || "Skill analysis failed."
            );
        }

        if (!data.skills || data.skills.length === 0) {

            results.innerHTML =
                "<p>No practical skills detected.</p>";

            return;
        }

        let skillsHTML = `
    <div class="skill-card">
        <h2>Skills Identified</h2>
        ${data.skills.map(skill => `
            <p>${skill}</p>
        `).join("")}
    </div>
`;

let opportunitiesHTML = "";

if (data.opportunities && data.opportunities.length > 0) {

    opportunitiesHTML = `
        <div class="opportunities-section">

            <h2>Recommended Opportunities</h2>

            ${data.opportunities.map(opportunity => `
                <div class="opportunity-card">

                    <h3>${opportunity.activity}</h3>

                    <p><strong>Scheme:</strong> ${opportunity.scheme}</p>

                    <p><strong>Type:</strong> ${opportunity.projectType}</p>
                    
                    <p><strong>Match:</strong> ${opportunity.matchScore}%</p>

                    <p><strong>Matched Skills:</strong></p>

                    <div>
                        ${opportunity.matchedSkills.map(skill => `
                            <span>${skill}</span>
                        `).join("")}
                    </div>

                </div>
            `).join("")}

        </div>
    `;

} else {

    opportunitiesHTML = `
        <div class="opportunities-section">
            <h2>No Matching Opportunities</h2>
            <p>We could not find a matching opportunity for your skills.</p>
        </div>
    `;
}

results.innerHTML =
    skillsHTML + opportunitiesHTML;

    } catch (error) {

        console.error(error);

        results.innerHTML =
            "<p>Unable to connect to the VoicePath backend.</p>";
    }
}