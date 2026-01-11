function getYouTubeId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  if (!match) throw new Error("Invalid YouTube URL");
  return match[1];
}

const ytLink = "https://www.youtube.com/watch?v=jNQXAC9IVRw";
const videoId = getYouTubeId(ytLink);

fetch("https://www.youtube-transcript.io/api/transcripts", {
  method: "POST",
  headers: {
    "Authorization": "Basic 696363e1b123a9631fd90e62",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    ids: [videoId]
  })
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(console.error);
