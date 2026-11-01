
const rawQueue = [
  "octocat",
  "torvalds",
  "",
  "  octocat  ",
  "octocat",
  12345,
  "thisuserdoesnotexist999888777"
];

async function runPipeline() {
  console.log("Starting GitHub Developer Intelligence Pipeline...\n");

  const eventLog = [];
  const processedDevelopers = [];
  const seen = new Set();

  let successfullyProcessed = 0;
  let invalidInputCount = 0;
  let notFoundCount = 0;
  let duplicateCount = 0;

  for (const rawInput of rawQueue) {
    // Validate input
    if (typeof rawInput !== "string" || rawInput.trim() === "") {
      invalidInputCount++;
      eventLog.push({
        username: String(rawInput),
        status: "invalid",
        reason: "Username must be a non-empty string"
      });
      console.log(`Invalid input: ${String(rawInput)}`);
      continue;
    }

    const username = rawInput.trim();

    // Remove duplicates after trimming
    if (seen.has(username.toLowerCase())) {
      duplicateCount++;
      eventLog.push({
        username,
        status: "duplicate",
        reason: "Username already submitted"
      });
      console.log(`Duplicate skipped: ${username}`);
      continue;
    }

    seen.add(username.toLowerCase());
    console.log(`Fetching developer: ${username}...`);

    try {
      const response = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        notFoundCount++;
        eventLog.push({
          username,
          status: "failed",
          reason: `HTTP ${response.status}`
        });
        console.log(`Failed: ${username} (HTTP ${response.status})`);
        continue;
      }

      const data = await response.json();

      // Extract information using destructuring
      const {
        name,
        followers,
        following,
        public_repos,
        location
      } = data;

      processedDevelopers.push({
        username,
        name: name || "N/A",
        followers: followers ?? 0,
        following: following ?? 0,
        public_repos: public_repos ?? 0,
        location: location || "N/A"
      });

      successfullyProcessed++;
      eventLog.push({
        username,
        status: "success",
        reason: "Processed successfully"
      });

      console.log(`Success: ${username}`);
    } catch (error) {
      notFoundCount++;
      eventLog.push({
        username,
        status: "failed",
        reason: error.message
      });
      console.log(`Error: ${username} - ${error.message}`);
    }
  }

  // Calculations
  const totalRepositories = processedDevelopers.reduce(
    (sum, dev) => sum + dev.public_repos, 0
  );

  const averageFollowers = processedDevelopers.length
    ? Math.round(
        processedDevelopers.reduce(
          (sum, dev) => sum + dev.followers, 0
        ) / processedDevelopers.length
      )
    : 0;

  const topFollowersDev = processedDevelopers.reduce(
    (max, dev) => !max || dev.followers > max.followers ? dev : max,
    null
  );

  const topReposDev = processedDevelopers.reduce(
    (max, dev) =>
      !max || dev.public_repos > max.public_repos ? dev : max,
    null
  );

  // Final report
  console.log("\n========== FINAL REPORT ==========");
  console.log(`Total submitted:        ${rawQueue.length}`);
  console.log(`Successfully processed: ${successfullyProcessed}`);
  console.log(`Invalid input:          ${invalidInputCount}`);
  console.log(`Duplicates skipped:     ${duplicateCount}`);
  console.log(`Failed requests:        ${notFoundCount}`);
  console.log(`Average followers:      ${averageFollowers}`);
  console.log(`Total repositories:     ${totalRepositories}`);

  console.log("\nTop followers:");
  console.log(topFollowersDev
    ? `${topFollowersDev.username} - ${topFollowersDev.followers}`
    : "No developers processed");

  console.log("\nTop repositories:");
  console.log(topReposDev
    ? `${topReposDev.username} - ${topReposDev.public_repos}`
    : "No developers processed");

  console.log("\nDeveloper Details:");
  console.table(processedDevelopers);

  console.log("\nEvent Log:");
  console.table(eventLog);
}

runPipeline();
