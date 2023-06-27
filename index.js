require("dotenv").config();
const prompt = require("prompt-sync")({ sigint: true });
const https = require("node:https");
const fs = require("node:fs");
const ora = require("ora");

(async () => {
  console.log("################## Multiplayer Finder ##################");
  const mpId = prompt("MP (ID / Backward / Forward): ");
  const keyword = prompt("Keywords: ").toLowerCase();
  const [id, backward, forward] = mpId.split(" ").map(Number);
  const startId = id - backward;
  const length = backward + forward;
  const mpList = Array.from({ length }, (_, i) => startId + i);
  const foundList = [];
  const log = ora();
  const userData =
    (await getUserData(keyword, process.env.API_KEY).catch((e) =>
      console.error(e)
    )) || "";
  console.log("################## ################## ##################");

  getMPdata(length, mpList);

  async function getMPdata(length, array) {
    log.start();
    for (let i = 0; i < length; i++) {
      try {
        const fetchMP = await new Promise((resolve, reject) => {
          https
            .get(
              `https://osu.ppy.sh/api/get_match?k=${process.env.API_KEY}&mp=${array[i]}`,
              async (res) => {
                const path = `./temp/mp_${array[i]}.json`;
                const filePath = fs.createWriteStream(path);
                res.pipe(filePath);
                filePath.on("finish", async () => {
                  resolve("ok");
                  filePath.close();
                });
              }
            )
            .on("error", (e) => {
              console.error(e);
              reject("error");
            });
        });
        if (fetchMP == "ok") {
          let data = require(`./temp/mp_${array[i]}.json`);
          fetchData(data, i, array[i]).catch((e) => {});
          fs.unlinkSync(`./temp/mp_${array[i]}.json`);
        }
      } catch (error) {
        console.error(error);
      }
    }
    log.succeed();
  }

  function fetchData(data, i, id) {
    return new Promise((resolve, reject) => {
      let userId = [];
      if (data.match?.name?.toLowerCase().includes(keyword)) {
        foundList.push(
          `> https://osu.ppy.sh/community/matches/${id} -> MP name: ${data.match.name}`
        );
        log.text = `Progress: ${i + 1}/${length} (${percentage(
          i + 1,
          length
        )}) | Found: ${foundList.length} \n${foundList.join("\n")}`;
        resolve("ok");
      } else {
        data.games.forEach((game) => {
          game.scores.forEach((score) => {
            if (score.user_id == userData[0].user_id) {
              userId.push(score.user_id);
            }
          });
        });
        if (userId.length > 0) {
          foundList.push(
            `> https://osu.ppy.sh/community/matches/${id} -> MP name: ${data.match.name} | User found: ${userData.username} | Score counts: ${userId.length}`
          );
          log.text = `Progress: ${i + 1}/${length} (${percentage(
            i + 1,
            length
          )}) | Found: ${foundList.length} \n${foundList.join("\n")}`;
          resolve("ok");
        }
      }
      log.text = `Progress: ${i + 1}/${length} (${percentage(
        i + 1,
        length
      )}) | Found: ${foundList.length} \n${foundList.join("\n")}`;
      reject("not found");
    });
  }

  function getUserData(user, api) {
    return new Promise((resolve, reject) => {
      const req = https.get(
        `https://osu.ppy.sh/api/get_user?k=${api}&m=1&u=${user}`,
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            resolve(JSON.parse(data));
          });
        }
      );
      req.on("error", (error) => {
        reject(new Error(error));
      });
    });
  }

  function percentage(partialValue, totalValue) {
    return `${parseFloat(((100 * partialValue) / totalValue).toFixed(2))}%`;
  }
})().catch((e) => {
  console.error(e);
});
