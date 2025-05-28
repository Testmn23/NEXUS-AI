
const {zokou} = require("../framework/zokou");
const {getUserStats, getTopUsers, setUserXP, addUserXP, resetUserRank } = require("../bdd/user_rank_bdd.js"); // Updated import with new functions


function get_level_exp(xp) {
    const levelThresholds = [
        { level: 1, xpThreshold: 500 },
        { level: 2, xpThreshold: 1000 },
        { level: 3, xpThreshold: 2000 },
        { level: 4, xpThreshold: 4000 },
        { level: 5, xpThreshold: 7000 },
        { level: 6, xpThreshold: 10000 },
        { level: 7, xpThreshold: 15000 },
        { level: 8, xpThreshold: 20000},
        { level: 9, xpThreshold: 25000},
        { level: 10, xpThreshold: 30000},
        { level: 11, xpThreshold: 35000},
        { level: 12, xpThreshold: 45000},
        { level: 13, xpThreshold: 55000},
        { level: 14, xpThreshold: 65000},
        { level: 15, xpThreshold: 75000},
        { level: 16, xpThreshold: 90000},
        { level: 17, xpThreshold: 105000},
        { level: 18, xpThreshold: 120000},
        { level: 19, xpThreshold: 135000},
        { level: 20, xpThreshold: 150000},
        { level: 21, xpThreshold: 170000},
        { level: 22, xpThreshold: 190000},
        { level: 23, xpThreshold: 210000},
        { level: 24, xpThreshold: 230000},
        { level: 25, xpThreshold: 255000},
        { level: 26, xpThreshold: 270000},
        { level: 27, xpThreshold: 295000},
        { level: 28, xpThreshold: 320000},
        { level: 29, xpThreshold: 345000},
        { level: 30, xpThreshold: 385000},
        { level: 31, xpThreshold: 425000},
        { level: 32, xpThreshold: 465000},
        { level: 33, xpThreshold: 505000},
        { level: 34, xpThreshold: 545000},
        { level: 35, xpThreshold: 590000},
        { level: 36, xpThreshold: 635000},
        { level: 37, xpThreshold: 680000},
        { level: 38, xpThreshold: 725000},
        { level: 39, xpThreshold: 770000},
        { level: 40, xpThreshold: 820000},
        { level: 41, xpThreshold: 870000},
        { level: 42, xpThreshold: 920000},
        { level: 43, xpThreshold: 970000},
        { level: 44, xpThreshold: 1020000},
        { level: 45, xpThreshold: 1075000},
        { level: 46, xpThreshold: 1130000},
        { level: 47, xpThreshold: 1185000},
        { level: 48, xpThreshold: 1240000},
        { level: 49, xpThreshold: 1295000},
        { level: 50, xpThreshold: 2000000} // Changed 'Zk-GOD' to 50 for consistency
    ];

    let currentLevel = 0;
    let currentXpInLevel = xp;
    let nextLevelXp = levelThresholds[0].xpThreshold;
    let previousLevelXpThreshold = 0;

    for (let i = 0; i < levelThresholds.length; i++) {
        if (xp >= levelThresholds[i].xpThreshold) {
            currentLevel = levelThresholds[i].level;
            previousLevelXpThreshold = levelThresholds[i].xpThreshold;
            if (levelThresholds[i + 1]) {
                nextLevelXp = levelThresholds[i + 1].xpThreshold;
                currentXpInLevel = xp - levelThresholds[i].xpThreshold;
            } else {
                // Max level reached or beyond
                nextLevelXp = Infinity; // Or some indicator for max level
                currentXpInLevel = xp - levelThresholds[i].xpThreshold; 
            }
        } else {
            // This case means the user's XP is less than the first threshold, or between thresholds
            // If currentLevel is still 0, it means XP < levelThresholds[0].xpThreshold
            if (currentLevel === 0) {
                 nextLevelXp = levelThresholds[0].xpThreshold;
                 currentXpInLevel = xp; // Total XP is XP in current (level 0)
            } else {
                 // This else block might not be strictly necessary with the current loop structure
                 // but ensures currentXpInLevel is relative to the current level's threshold
                 currentXpInLevel = xp - previousLevelXpThreshold;
            }
            break; 
        }
    }
    
    // If XP is less than the first threshold, currentLevel remains 0
    // currentXpInLevel is totalXP, nextLevelXp is the first threshold.
    if (xp < levelThresholds[0].xpThreshold) {
        currentLevel = 0;
        currentXpInLevel = xp;
        nextLevelXp = levelThresholds[0].xpThreshold;
    }


    let roleName;
    if (currentLevel < 5) {
        roleName = 'Newborn';
    } else if (currentLevel >= 5 && currentLevel < 10) {
        roleName = 'Kid Ninja';
    } else if (currentLevel >= 10 && currentLevel < 15) {
        roleName = 'Genin Ninja';
    } else if (currentLevel >= 15 && currentLevel < 20) {
        roleName = 'Chunin Ninja';
    } else if (currentLevel >= 20 && currentLevel < 25) {
        roleName = 'Jonin Ninja';
    } else if (currentLevel >= 25 && currentLevel < 30) {
        roleName = 'ANBU';
    } else if (currentLevel >= 30 && currentLevel < 35) {
        roleName = 'Strong Ninja';
    } else if (currentLevel >= 35 && currentLevel < 40) {
        roleName = 'Kage';
    } else if (currentLevel >= 40 && currentLevel < 45) {
        roleName = 'Hermit Seinin';
    } else if (currentLevel >= 45 && currentLevel < 50) {
        roleName = 'Otsutsuki';
    } else { // currentLevel >= 50
        roleName = 'Divinity'; // Changed from GOD/level-GOD
    }

    return {
        level: currentLevel,
        xplimit: nextLevelXp,
        exp: currentXpInLevel,
        role: roleName
    };
}

module.exports = {
   get_level_exp,
} ;

zokou( {
  nomCom : "rank",
 categorie : "Fun",
   }, 
   async(dest,zk, commandeOptions)=> {
  
    const {ms , repondre,auteurMessage,nomAuteurMessage, msgRepondu , auteurMsgRepondu , mybotpic, verifGroupe} = commandeOptions ; // Added verifGroupe

  if (msgRepondu) {
      
       try {
          
        if (!verifGroupe) { // Ensure command is used in a group if needed by getUserStats
            repondre("This command must be used in a group to check rank."); return;
        }
        let userStats = await getUserStats(dest, auteurMsgRepondu) ;

        const data = get_level_exp(userStats.xp) // get_level_exp is not async
         let ppuser ;
    
         
         try {
              ppuser = await zk.profilePictureUrl(auteurMsgRepondu , 'image') ;
         } catch {
            ppuser = mybotpic()
         } ;
    
    
         // Role is now directly from data.role
    
         let msg = `
┏━━━┛ NEXUS-AI Rank ┗━━━┓
         
    *Name :* @${auteurMsgRepondu.split("@")[0]}
    
    *Level :* ${data.level}
    
    *Role :* ${data.role}

    *EXP :* ${data.exp} / ${data.xplimit === Infinity ? 'Max' : data.xplimit}
    
    *Messages (in this group) :* ${userStats.messages}
    
   ┕━✿━┑  ┍━✿━┙`
    
     zk.sendMessage( 
        dest,
        {
            image : {url : ppuser},
            caption : msg,
            mentions : [auteurMsgRepondu]
        },
        {quoted : ms}
      )


       } catch (error) {
         repondre(error)
       }
  }   else {


      try {
        if (!verifGroupe) { // Ensure command is used in a group
            repondre("This command must be used in a group to check your rank."); return;
        }
        let jid = auteurMessage ;
          
        let userStats = await getUserStats(dest, jid) ;

        const data =  get_level_exp(userStats.xp) // get_level_exp is not async
         let ppuser ;
    
         
         try {
              ppuser = await zk.profilePictureUrl(jid, 'image') ;
         } catch {
            ppuser = mybotpic()
         } ;
    
    
        // Role is now directly from data.role
    
         let msg = `
┏━━━┛ NEXUS-AI Rank ┗━━━┓
     
  *Name :* ${nomAuteurMessage}

  *Level :* ${data.level}

  *Role :* ${data.role}

  *EXP :* ${data.exp} / ${data.xplimit === Infinity ? 'Max' : data.xplimit}

  *Messages (in this group) :* ${userStats.messages}

   ┕━✿━┑  ┍━✿━┙`
    
     zk.sendMessage( 
        dest,
        {
            image : {url : ppuser},
            caption : msg
        },
        {quoted : ms}
      )

      } catch (error) {
         repondre(error)
      }

    } 


}) ;

zokou( {
  nomCom : "toprank",
 categorie : "Fun",
   }, 
   async(dest,zk, commandeOptions)=> {
  
    const {ms , mybotpic, verifGroupe, repondre} = commandeOptions ; // Added verifGroupe and repondre

    if (!verifGroupe) {
        repondre('This command can only be used in groups.');
        return;
    }

       let msg = `┏━━┛ NEXUS-AI Top Ranks (Current Group) ┗━━┓\n\n`;
       
      let topUsersInGroup = await getTopUsers(dest, 10) ;

      if (!topUsersInGroup || topUsersInGroup.length === 0) {
        repondre("No ranked users in this group yet.");
        return;
      }

        let mention = [] ;
        for (const userRankData of topUsersInGroup ) {

             const levelData = get_level_exp(userRankData.xp) ; // get_level_exp is not async

            // Role is now directly from levelData.role
            msg += `-----------------------
            
 *Name:* @${userRankData.userId.split("@")[0]}
*Level:* ${levelData.level}
*Role:* ${levelData.role}
*Messages:* ${userRankData.messages}\n`; // Added message count for context

        mention.push(userRankData.userId) ;
        }

       zk.sendMessage(dest,
                      {
                        image : { url : mybotpic() },
                        caption : msg,
                        mentions : mention
                      },
                      {quoted : ms})
       

   })


// Admin Commands for Rank Management

zokou({
    nomCom: 'setxp',
    categorie: 'Admin',
    reaction: '📊'
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, repondre, superUser, verifGroupe, verifAdmin, msgRepondu, auteurMsgRepondu } = commandeOptions;

    if (!verifGroupe) { return repondre('This command can only be used in groups.'); }
    if (!verifAdmin && !superUser) { return repondre('This command is for group admins or bot superusers only.'); }

    if (!msgRepondu) { return repondre('Please reply to the message of the user whose XP you want to set.'); }
    const targetUser = auteurMsgRepondu;

    const amount = parseInt(arg[0]);
    if (isNaN(amount) || amount < 0) { return repondre('Invalid amount. XP must be a non-negative number. Usage: .setxp <amount>'); }

    await setUserXP(dest, targetUser, amount);
    repondre(`XP for @${targetUser.split('@')[0]} in this group has been set to ${amount}.`, { mentions: [targetUser] });
});

zokou({
    nomCom: 'addxp',
    categorie: 'Admin',
    reaction: '➕'
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, repondre, superUser, verifGroupe, verifAdmin, msgRepondu, auteurMsgRepondu } = commandeOptions;

    if (!verifGroupe) { return repondre('This command can only be used in groups.'); }
    if (!verifAdmin && !superUser) { return repondre('This command is for group admins or bot superusers only.'); }

    if (!msgRepondu) { return repondre('Please reply to the message of the user to whom you want to add XP.'); }
    const targetUser = auteurMsgRepondu;

    const amount = parseInt(arg[0]);
    if (isNaN(amount)) { return repondre('Invalid amount. XP must be a number. Usage: .addxp <amount>'); }

    await addUserXP(dest, targetUser, amount);
    const updatedStats = await getUserStats(dest, targetUser); // Fetch updated stats
    repondre(`${amount} XP added to @${targetUser.split('@')[0]} in this group. New XP: ${updatedStats.xp}.`, { mentions: [targetUser] });
});

zokou({
    nomCom: 'resetrank',
    categorie: 'Admin',
    reaction: '🔄'
}, async (dest, zk, commandeOptions) => {
    const { ms, arg, repondre, superUser, verifGroupe, verifAdmin, msgRepondu, auteurMsgRepondu } = commandeOptions;

    if (!verifGroupe) { return repondre('This command can only be used in groups.'); }
    if (!verifAdmin && !superUser) { return repondre('This command is for group admins or bot superusers only.'); }

    if (!msgRepondu) { return repondre('Please reply to the message of the user whose rank you want to reset.'); }
    const targetUser = auteurMsgRepondu;

    await resetUserRank(dest, targetUser);
    repondre(`Rank for @${targetUser.split('@')[0]} in this group has been reset (XP and messages set to 0).`, { mentions: [targetUser] });
});
