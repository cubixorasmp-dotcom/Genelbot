require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  EmbedBuilder,
  ActivityType,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

// 🌐 Render'ın port isteğini karşılamak için basit web sunucusu
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot aktif ve çalışıyor!");
});

app.listen(PORT, () => {
  console.log(`Web sunucusu ${PORT} portunda dinlemede.`);
});

// 🤖 Discord Bot Kurulumu
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent // Mesaj içeriğini okumak için kritik intent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

const otorolSettings = new Map();

const slashCommands = [
  new SlashCommandBuilder()
    .setName("otorol-ayarla")
    .setDescription("Sunucuya yeni girenlere verilecek otomatik rolü ayarlar.")
    .addRoleOption(option =>
      option.setName("rol")
        .setDescription("Yeni üyelere verilecek otomatik rol")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("otorol-kapat")
    .setDescription("Otorol sistemini devre dışı bırakır.")
];

client.once("ready", async () => {
  console.log(`Otorol ve Site Botu aktif: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "!site ile panele ulaşın!", type: ActivityType.Watching }],
    status: "online"
  });

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.set(slashCommands.map(c => c.toJSON()));
    } catch {}
  }
});

// Yeni üye katıldığında otomatik rol verme
client.on("guildMemberAdd", async member => {
  const roleId = otorolSettings.get(member.guild.id);
  if (!roleId) return;

  const role = member.guild.roles.cache.get(roleId);
  if (!role) return;

  try {
    await member.roles.add(role);
    console.log(`[Otorol] ${member.user.tag} adlı kullanıcıya ${role.name} rolü verildi.`);
  } catch (error) {
    console.error(`[Otorol Hata] Rol verilemedi: ${error}`);
  }
});

// Mesaj komutları (!site)
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "!site") {
    const siteEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🌟 CubixoraSMP Web Paneli")
      .setDescription("Sunucumuza kayıt olmak, yetkili başvurusu yapmak ve destek talebi oluşturmak için web sitemizi ziyaret edebilirsiniz!")
      .addFields(
        { name: "🌐 Web Sitesi", value: "[cubixoraweb.onrender.com](https://cubixoraweb.onrender.com)", inline: true },
        { name: "🎮 Sunucu IP", value: "`Cubixorasmp.play.hosting`", inline: true }
      )
      .setFooter({ text: "CubixoraSMP Yönetimi", iconURL: message.guild.iconURL() })
      .setTimestamp();

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Web Sitesini Aç")
          .setStyle(ButtonStyle.Link)
          .setUrl("https://cubixoraweb.onrender.com")
          .setEmoji("🔗")
      );

    await message.reply({ embeds: [siteEmbed], components: [row] });
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild, member } = interaction;

  if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ 
      content: "❌ Bu komutu kullanabilmek için **Yönetici** yetkisine sahip olmalısın!", 
      ephemeral: true 
    });
  }

  if (commandName === "otorol-ayarla") {
    const targetRole = interaction.options.getRole("rol");

    if (targetRole.position >= guild.members.me.roles.highest.position) {
      systemReply = "❌ Bu rolün yetkisi benim en yüksek rolümden üstte.";
      return interaction.reply({ content: systemReply, ephemeral: true });
    }

    otorolSettings.set(guild.id, targetRole.id);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Otorol Başarıyla Aktif Edildi")
      .setDescription(`Artık sunucuya yeni katılan kullanıcılara otomatik olarak **${targetRole}** rolü verilecek.`)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  if (commandName === "otorol-kapat") {
    if (!otorolSettings.has(guild.id)) {
      return interaction.reply({ content: "⚠️ Bu sunucuda aktif bir otorol sistemi bulunmuyor.", ephemeral: true });
    }

    otorolSettings.delete(guild.id);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔒 Otorol Kapatıldı")
      .setDescription("Otorol sistemi devre dışı bırakıldı.")
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
