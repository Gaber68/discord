const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const express = require("express");
const cors = require("cors");

// --- Discord Bot Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ["CHANNEL"] // za DMe
});

// Vnesi svoj token lokalno
client.login("MTQ1NTI5NzgxNzMzMjY3ODc5Nw.GMI4Nr.p4FTPFMg9M8S1I9czlUDB0jIP3So6IfG0BTLcw");

client.once("ready", async () => {
  console.log(`Bot je online kot ${client.user.tag}`);

  // Testno sporočilo ob zagonu
  const CHANNEL_ID = "1455298636568072276";
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const embed = new EmbedBuilder()
      .setTitle("Bot je pripravljen!")
      .setDescription("Epstein je prišel v mesto! Uporabi **`!komande`** za seznam komand.")
      .setColor("#5865F2")
      .setTimestamp();
    channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Napaka pri pošiljanju sporočila ob zagonu:", err);
  }
});

// --- Komande ---
const commands = [
  { name: "ping", description: "Preveri, ali je bot živ." },
  { name: "zdravo", description: "Pozdravi bota." },
  { name: "kocka", description: "Vrzi kocko (1-6)." },
  { name: "zasmej", description: "Dobi smešen 'roast'." },
  { name: "pingpong", description: "Pošlje nekaj ping emojijev." },
  { name: "hack", description: "Ponarejeni 'hack' (šala)." },
  { name: "komande", description: "Prikaže vse razpoložljive komande." },
  { name: "zbrisi", description: "Izbriše vsa sporočila v kanalu (samo owner strežnika)." },
  { name: "pogovor", description: "User lahko zahteva pogovor" }
];

// --- Funkcija za pošiljanje embed sporočil ---
function sendEmbed(channel, title, description, color = "#5865F2") {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
  channel.send({ embeds: [embed] });
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).toLowerCase();

  // --- Komande ---
  if (args === "ping") sendEmbed(message.channel, "Ping", "Pong! 🏓");
  else if (args === "zdravo") sendEmbed(message.channel, "Pozdrav", `Hej ${message.author.username}, kako si? 👋`);
  else if (args === "kocka") {
    const roll = Math.floor(Math.random() * 6) + 1;
    sendEmbed(message.channel, "Kocka", `Vrednost tvojega meta je **${roll}**! 🎲`);
  }
  else if (args === "zasmej") {
    const roasts = [
      "Si človeška verzija pokalčke za sodelovanje 😜",
      "Če je smeh najboljše zdravilo, tvoja faca zdravi svet 😂",
      "Si kot oblak. Ko izgineš, je čudovit dan ☁️"
    ];
    sendEmbed(message.channel, "Roast", roasts[Math.floor(Math.random() * roasts.length)], "#FF5555");
  }
  else if (args === "pingpong") sendEmbed(message.channel, "Ping Pong", "🏓🏓🏓🏓🏓");
  else if (args === "hack") sendEmbed(message.channel, "Hack", "Inicializiram hack... 💻\n10%\n50%\n100%\nŠala 😎, varen si!", "#FFAA00");
  else if (args === "komande") {
    let description = "";
    commands.forEach(cmd => {
      description += `**!${cmd.name}** - ${cmd.description}\n`;
    });
    try {
      await message.author.send({ embeds: [new EmbedBuilder()
        .setTitle("Seznam komand")
        .setDescription(description)
        .setColor("#00FF99")
        .setTimestamp()] });
      if (message.channel.type !== "DM") message.reply("Poslal sem ti DM z vsemi komandami! 📩");
    } catch (err) {
      console.error("Napaka pri pošiljanju DM:", err);
      sendEmbed(message.channel, "Napaka", "Ne morem ti poslati DM. Preveri svoje nastavitve zasebnosti!", "#FF5555");
    }
  }
  else if (args === "zbrisi") {
    if (!message.guild) return sendEmbed(message.channel, "Napaka", "To komando lahko uporabiš samo v strežniku.", "#FF5555");
    if (message.author.id !== message.guild.ownerId) return sendEmbed(message.channel, "Dostop zavrnjen", "To komando lahko uporabi samo **lastnik strežnika**.", "#FF5555");

    try {
      let deleted = 0;
      while (true) {
        const fetched = await message.channel.messages.fetch({ limit: 100 });
        if (fetched.size === 0) break;
        const deletable = fetched.filter(msg => Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
        if (deletable.size === 0) break;
        await message.channel.bulkDelete(deletable, true);
        deleted += deletable.size;
      }
      sendEmbed(message.channel, "🧹 Pogovor počiščen", `Uspešno izbrisanih **${deleted}** sporočil.`, "#00FF99");
    } catch (err) {
      console.error(err);
      sendEmbed(message.channel, "Napaka", "Prišlo je do napake pri brisanju sporočil.", "#FF5555");
    }
  }
  // --- NOVA KOMANDA: !pogovor ---
  else if (args === "pogovor") {
    try {
      const owner = await client.users.fetch("1187464674321633320"); // tvoj ID
      const dmEmbed = new EmbedBuilder()
        .setTitle("Nekdo želi pogovor")
        .setDescription(`User **${message.author.tag}** želi začeti pogovor.\nAli se lahko pogovarjaš?`)
        .setColor("#00AAFF")
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("pogovor_da")
            .setLabel("Da")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("pogovor_ne")
            .setLabel("Ne")
            .setStyle(ButtonStyle.Danger)
        );

      const dmMessage = await owner.send({ embeds: [dmEmbed], components: [row] });

      const filter = i => i.user.id === "1187464674321633320";
      const collector = dmMessage.createMessageComponentCollector({ filter, time: 20000 });

      let responded = false;

      collector.on("collect", async i => {
        if (i.customId === "pogovor_da") {
          await i.update({ content: "Pogovor je aktiven!", embeds: [], components: [] });
          message.channel.send(`Pogovor je aktiven! 💬`);
          responded = true;
        } else if (i.customId === "pogovor_ne") {
          await i.update({ content: "Trenutno se ne moremo pogovarjati.", embeds: [], components: [] });
          message.channel.send(`Trenutno se ne moremo pogovarjati. ⛔`);
          responded = true;
        }
        collector.stop();
      });

      collector.on("end", collected => {
        if (!responded) {
          message.channel.send(`Trenutno se ne moremo pogovarjati. ⏱️`);
          dmMessage.edit({ content: "Pogovor je potekel (20s ni odgovora).", embeds: [], components: [] });
        }
      });

      message.reply("Poslal sem prošnjo za pogovor. Počakaj moj odgovor! 📩");
    } catch (err) {
      console.error(err);
      sendEmbed(message.channel, "Napaka", "Prišlo je do napake pri pošiljanju prošnje za pogovor.", "#FF5555");
    }
  }

  else if (args.startsWith("role")) {
  if (!message.member.permissions.has("ManageRoles")) {
    return sendEmbed(message.channel, "Napaka", "Nimaš pravice za upravljanje z rolemi.", "#FF5555");
  }

  const [_, action, roleName, mention] = args.split(" ");
  const member = mention ? message.mentions.members.first() : null;

  if (!action) return sendEmbed(message.channel, "Napaka", "Uporabi: !role create/delete/add/remove [ime role] [@user]", "#FF5555");

  switch (action.toLowerCase()) {
    case "create":
      if (!roleName) return sendEmbed(message.channel, "Napaka", "Vpiši ime nove role.", "#FF5555");
      message.guild.roles.create({ name: roleName, color: "BLUE", reason: `Ustvarjena preko bota ${message.author.tag}` })
        .then(role => sendEmbed(message.channel, "Ustvarjena role", `Role **${role.name}** je bila ustvarjena. ✅`, "#00FF99"))
        .catch(err => { console.error(err); sendEmbed(message.channel, "Napaka", "Napaka pri ustvarjanju role.", "#FF5555"); });
      break;

    case "delete":
      if (!roleName) return sendEmbed(message.channel, "Napaka", "Vpiši ime role za izbris.", "#FF5555");
      const roleToDelete = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!roleToDelete) return sendEmbed(message.channel, "Napaka", "Role ni najdena.", "#FF5555");
      roleToDelete.delete(`Izbrisana preko bota ${message.author.tag}`)
        .then(() => sendEmbed(message.channel, "Izbrisana role", `Role **${roleToDelete.name}** je bila izbrisana. ✅`, "#00FF99"))
        .catch(err => { console.error(err); sendEmbed(message.channel, "Napaka", "Napaka pri brisanju role.", "#FF5555"); });
      break;

    case "add":
      if (!roleName || !member) return sendEmbed(message.channel, "Napaka", "Označi člana in vpiši ime role.", "#FF5555");
      const roleToAdd = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!roleToAdd) return sendEmbed(message.channel, "Napaka", "Role ni najdena.", "#FF5555");
      member.roles.add(roleToAdd)
        .then(() => sendEmbed(message.channel, "Role dodana", `Role **${roleToAdd.name}** je bila dodana uporabniku **${member.user.tag}**. ✅`, "#00FF99"))
        .catch(err => { console.error(err); sendEmbed(message.channel, "Napaka", "Napaka pri dodajanju role.", "#FF5555"); });
      break;

    case "remove":
      if (!roleName || !member) return sendEmbed(message.channel, "Napaka", "Označi člana in vpiši ime role.", "#FF5555");
      const roleToRemove = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!roleToRemove) return sendEmbed(message.channel, "Napaka", "Role ni najdena.", "#FF5555");
      member.roles.remove(roleToRemove)
        .then(() => sendEmbed(message.channel, "Role odstranjena", `Role **${roleToRemove.name}** je bila odstranjena uporabniku **${member.user.tag}**. ✅`, "#00FF99"))
        .catch(err => { console.error(err); sendEmbed(message.channel, "Napaka", "Napaka pri odstranjevanju role.", "#FF5555"); });
      break;

    default:
      sendEmbed(message.channel, "Napaka", "Nepoznata akcija. Uporabi create/delete/add/remove.", "#FF5555");
  }
}
  
});

// --- Express API za spletno stran ---
const app = express();
app.use(cors());
app.use(express.json());

const CHANNEL_ID = "1455298636568072276";

app.post("/send", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).send("Ni sporočila");

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    
    // Pošlji sporočilo kot plain text
    await channel.send(message);

    res.send("Poslano");
  } catch (err) {
    console.error("Napaka pri pošiljanju sporočila preko API:", err);
    res.status(500).send("Napaka pri pošiljanju sporočila");
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Spletni strežnik teče na portu ${PORT}`));
