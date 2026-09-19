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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// Sunucu bazlı otorol ayarlarını tutmak için bellek haritası
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

  // Komutları Discord'a kaydetme
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.set(slashCommands.map(c => c.toJSON()));
    } catch {}
  }
});

// Yeni üye katıldığında rolü otomatik verme
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

// Mesaj tabanlı komutlar (!site vb.)
client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === '!site') {
    // Şık bir Embed (Gömülü Mesaj) oluşturuyoruz
    const siteEmbed = new EmbedBuilder()
      .setColor('#5865F2') // Discord mavisi
      .setTitle('🌟 CubixoraSMP Web Paneli')
      .setDescription('Sunucumuza kayıt olmak, yetkili başvurusu yapmak ve destek talebi (ticket) oluşturmak için aşağıdaki butona tıklayarak web sitemizi ziyaret edebilirsiniz!')
      .addFields(
        { name: '🌐 Web Sitesi', value: '[cubixoraweb.onrender.com](https://cubixoraweb.onrender.com)', inline: true },
        { name: '🎮 Sunucu IP', value: '`Cubixorasmp.play.hosting`', inline: true }
      )
      .setFooter({ text: 'CubixoraSMP Yönetimi', iconURL: message.guild.iconURL() })
      .setTimestamp();

    // Siteye doğrudan gitmek için tıklanabilir buton ekliyoruz
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Web Sitesini Aç')
          .setStyle(ButtonStyle.Link)
          .setUrl('https://cubixoraweb.onrender.com')
          .setEmoji('🔗')
      );

    // Mesajı kanala gönderiyoruz
    await message.reply({ embeds: [siteEmbed], components: [row] });
  }
});

// Slash komutlarını yönetme
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild, member } = interaction;

  // Yetki kontrolü (Yönetici olmayanlar ayar yapamaz)
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ 
      content: "❌ Bu komutu kullanabilmek için **Yönetici** yetkisine sahip olmalısın!", 
      ephemeral: true 
    });
  }

  if (commandName === "otorol-ayarla") {
    const targetRole = interaction.options.getRole("rol");

    // Botun rolü, verilecek rolden yukarıda mı kontrolü
    if (targetRole.position >= guild.members.me.roles.highest.position) {
      return interaction.reply({
        content: "❌ Bu rolün yetkisi benim en yüksek rolümden üstte veya aynı seviyede. Rolümü en üste taşımalısın!",
        ephemeral: true
      });
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
      return interaction.reply({ content: "⚠️ Bu sunucuda zaten aktif bir otorol sistemi bulunmuyor.", ephemeral: true });
    }

    otorolSettings.delete(guild.id);

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("🔒 Otorol Kapatıldı")
      .setDescription("Otorol sistemi bu sunucu için devre dışı bırakıldı.")
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
