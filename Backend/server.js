require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const opportunities = require("./opportunities.json");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

function matchOpportunities(skills) {

    const skillAliases = {
        "tailoring": [
            "tailoring",
            "garment making",
            "dress making",
            "clothing",
            "sewing"
        ],

        "sewing": [
            "sewing",
            "sewing clothes",
            "stitching",
            "garment making",
            "dress making",
            "clothing"
        ],

        "sewing machine": [
            "sewing machine",
            "sewing machine operation",
            "machine sewing",
            "using a sewing machine"
        ],

        "embroidery": [
            "embroidery",
            "embroidery work",
            "decorative stitching"
        ],

        "weaving": [
            "weaving",
            "handloom",
            "textile weaving"
        ]
    };

    const normalizedSkills = skills.map(skill =>
        skill.toLowerCase().trim()
    );

    return opportunities
        .map(opportunity => {

            const matchedSkills = [];

            opportunity.skills.forEach(opportunitySkill => {

                const normalizedOpportunitySkill =
                    opportunitySkill.toLowerCase().trim();

                let isMatch = false;

                normalizedSkills.forEach(userSkill => {

                    if (
                        userSkill === normalizedOpportunitySkill ||
                        userSkill.includes(normalizedOpportunitySkill) ||
                        normalizedOpportunitySkill.includes(userSkill)
                    ) {
                        isMatch = true;
                    }

                    Object.values(skillAliases).forEach(aliasGroup => {

                        const userMatchesGroup =
                            aliasGroup.some(alias =>
                                userSkill.includes(alias)
                            );

                        const opportunityMatchesGroup =
                            aliasGroup.some(alias =>
                                normalizedOpportunitySkill.includes(alias)
                            );

                        if (userMatchesGroup && opportunityMatchesGroup) {
                            isMatch = true;
                        }
                    });

                });

                if (isMatch) {
                    matchedSkills.push(opportunitySkill);
                }
            });

            const uniqueMatchedSkills = [
                ...new Set(matchedSkills)
            ];

            const score =
                uniqueMatchedSkills.length /
                opportunity.skills.length *
                100;

            return {
                ...opportunity,
                matchedSkills: uniqueMatchedSkills,
                matchScore: Math.round(score)
            };

        })
        .filter(opportunity =>
            opportunity.matchedSkills.length > 0
        )
        .sort((a, b) =>
            b.matchScore - a.matchScore
        );
}

app.post("/analyze", async (req, res) => {

    const { transcript, language } = req.body;

    if (!transcript) {
        return res.json({
            skills: []
        });
    }

    try {

        const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: `
Extract the practical skills from this speech.

Speech:
${transcript}

Return only the practical skills that the person says they can do or have experience in.
Do not return the full sentence.
Do not return explanations.
`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "object",
                    properties: {
                        skills: {
                            type: "array",
                            items: {
                                type: "string"
                            }
                        }
                    },
                    required: ["skills"]
                }
            }
        });

        console.log("Gemini response:", response.text);

        const result = JSON.parse(response.text);

        console.log("Detected skills:", result.skills);

        const skills = result.skills || [];

        console.log(
            "Matcher test:",
            matchOpportunities(skills)
        );

        const matchedOpportunities =
            matchOpportunities(skills);

        res.json({
            transcript: transcript,
            language: language,
            skills: skills,
            opportunities: matchedOpportunities
        });

    } catch (error) {

        console.error("Gemini error:", error);

        res.status(500).json({
            error: error.message || "Gemini skill analysis failed."
        });

    }

});

app.get("/", (req, res) => {

    res.json({
        message: "VoicePath backend is running!"
    });

});

app.listen(PORT, () => {

    console.log(
        "VoicePath backend running on http://localhost:5000"
    );

});