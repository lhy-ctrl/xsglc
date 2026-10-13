/*
 * core.js —— 纯业务逻辑（UMD），可在 Node 测试与浏览器中复用。
 * 本文件只放“无 DOM 依赖”的纯函数，随开发阶段逐步扩充。
 */
(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.AppCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- 导航定义 ----
  var NAV_ITEMS = [
    { key: 'home', label: '首页' },
    { key: 'students', label: '学生信息' },
    { key: 'score', label: '量化管理分' },
    { key: 'discipline', label: '违纪次数' },
    { key: 'leave', label: '请假名单' },
    { key: 'report', label: '每日通报' },
    { key: 'dorm', label: '寝室数据' },
    { key: 'employee', label: '教官绩效' },
    { key: 'duty', label: '值班排班' },
    { key: 'dutyStaff', label: '员工管理' },
    { key: 'settings', label: '数据与设置' }
  ];

  var GRADES = ['高一', '高二', '高三'];

  // ---- 拼音首字母（按 Unicode 码点索引，0x4E00 起，'0' 表示无法识别）----
  var PINYIN_INITIALS = 'ydkqsxhwzssxjbymgcczqpssqbycdscdqldylybsgjgyqzjjfgcclzzbwdwzjljpfyynwjjtmyyzwzhflyppqhgccyyymjqyxxgjxhsdsjnjjsmhmlzrxyfsngsyczqzggllyjlmyzssecykyyhqwjssggyxyqyjtwkdjhychmyxjtlxjyqbyxdldwrrjjwysrldzjpcbzjjbrcfslbczstzfxxthtrqggbdlyccscymmrfcyqzpwwjjyfcrwfdfzqpyddwyxkyjawjffxjpdftzyhhycyswccyqsclcxxwzzxnbgnnxbxlzsqcbsgpysyzdhmdzbqbzcwdzzyytzhbtsyyfzgntnxqywqskbphhlxgybfmjebjhhgqtjcysxstkzglyckglysmzxyalmeldccxgzyrcxsdltjzcqkcnnjwhjczzcqljststbnxbtyxceqxgkwjyflzqlyhjqspsfxlfpbyqxxxydcczylllsjxfhjxpjbcffyabyxbhczbjyclwlczggbtssmdtjcxpthyqtgjjscjfzkjzjqnlzwlslhdzbwjncjzyzsqnycqyrzcjjwybrtwpyftwexcskdzctbxhyzcyyjxzcfbzzmjyxxcdczottbzljwfcgszsxfyrlnyjmbdthjxsqjccsbxyytsyfbjdztgbcnclcyzzbsacyzzscjcshzqydxlbpjllmqxtydzxsqjtzpxlcglqccwjbhctdjjsfxjejjtlbgxsxjmyjjqpfzasyjncydjxkjcdjszcbartcclnjqmwnqnclllkbybzzsyhqcltwlccrshllzntylnewyzyxczxxgdkdmtcedejtsyys兙dqdfmsd兡jlhrwnqlybglxhlgtgxbqjdzfyjsjyjcjmrnymgrcjczgjmzmgxmmryxkjnymsgmzjymklfxmbdtgfbhcjhkylpfmdxlqjjsmtqgzsjlqdldgjycalcmzcsdjllnxdjffffjczfmzffpfkhkgdpqxktacjdhhzdddrrcfqyjkqccwjdxhwjlyllzgcfcqdsmlzpbjjplsbcjggdckkdezsqsckjgcgkdjtjllzycxklqscgjcltfpcqczgwbjdqsdjjbyjhsjddwgfsjgdkccctllpspkjgqjhzzljplgjgjjthjjyjzcjmlzlyqbgjwmljkxzdznjqsyzmljlljkywxmkjlhskjgbmclyymkxjqlbmclkmdxxkwyxwslmlpsjqjcqxyjfjtjdxmxxllcrqbsyjbgwywxggbcyxpjtgpepfgdjgbhbnsfjyzjkjkhxqfgqzkfhygkhdgllsdjjxpqykybnqsxqnszswhbsxwhxwbzzxdmndjbsbkbbzklylxgwxjjwaqzmywsjqlcjxxjqwjeqxscwetlzhlyyysdzpyqyzcptlshtzcfycyxyljsdcjjagyslcllyyysglrqqeldxzsccccadycjysfsgbfrsszqsbxjpsjwsdrckgjlgdkzjzbdktcsyqpyhstcldjlhmxmcgxyzhjdctmhltxzxylymohyjcltyfbqqjbfbdfehtksqhzywwcnxxcdwhhwgyjlegmdqcwgfjhcsntwydolbygwqwesjpwnmlrydzsztxyqpzgcwxhngpyxshmdqjgztdppbfyhzhhjyfdzwkgkzbldntsxhqeegzxylzmmzyjzgszxkhkhtxexxgylyapsthxdwhzydpxagkydxbhnhxkdfjnmyhylpmgocslnzhkxxlbzzlbmlsfbhhgsgyyggbhscyajtxwlxtzqcwzydqdqmmgdqllszhlsjzwfjhqswscelqazynytlsxthaznkzzsdhlacxtwwcsgqqtddyzbcchyqzflxpslzygpzsznglydqcbdlxjtctajdkywnsyzljhhdzcwnyyzyomhychhhxhjkzwsxhdnxlyscqydpclyzwmypbkxyjlkzhtyhaxqsyshxasmchkdscrswjpwqsgzjlwwschs嗧hsqnhzsngndaqtbaalzzmsstdqjcjktscjaxplggxhhgoxzcxpdmmhldgtybysjmxhmrcplxjzckzxshflqxccdhxezfchzccdytcjyxqhlxdhypjqxnlsyydzozjnyxqezysjyayjkypdghddxsppyzndlthrhxydpcjjhtcxmctlhbynyhmhzllhnxmylllmdcppxhmxdkycyrdltxjchhznxclcclylnzsxzjzzlnnllwhyqsnjhxynttdkyjpychhyegkcttwlgqrlggtgtygyhpyhylqyqgcwyqkpyyyttttlhyhlltyttsplkyzwgywgpydqqzzdqxskcqnmjjzzbxyqmjrtfbbtkhzkbjdjjkdjjtlbwfzpbtkqtztgpdgntpjyfalqmkgxbcclzfhzclllladpmxdjhlcclgyhdzfgyddgcyyfgydxkssebdhykdkdkhnaxxybfbyyhxcqgabfqyjjdmljcsjzllpchbsxgjyndybyqspqwjlzkcddtaccbkzdyzypjzqsjnkktknjdjgyepgtlfyqkasdntcyhblgdzhbbydmjrygkzyheyybcmcdtyfzjjhgcjplxhldwxjjkytcyksssmtwcttqzlzbszdtwzxgzagyktywxlhlcpbclloqmmzsslcmbjcszzkydczxgqjdsmcytzqqlwzqzxssbpkdfqmddzdsddtdmfhtdyzjaqjqkypbdjyyxtljhdrqxxxhaydhrjlklytwhllrllrcxylbwsrszzsymkzzhhkyhxksmzsyzgcjfbzbsqlfcxxxnxkxwymsddyqwggqmmyhcdzttfgyyhgstttybykjdhkyjbelhdypjqnfxfdqkzhqkzbyjtzbxhfdxbdaswhawajldyjsfhbldnndnqjtjnchxfjsrfwhzfmdrfjyhwzpdjkzyjymfcyznynxfbytfwfwygdbnzzzdnytxzemmqbsqehxfzmbmflzzsrsymjgsxwzjsprydjsjgxhjjgljjynzjjxhgjkymlpeyycsysgqzswhwlyrjlpxslcxmfsmwkcctnxnynpnjszhdzeptxmwywayysywlxjqzqxzdclaeelmcpjpclwbxsqhfwrtffjtnqjhjqdxhwlbyccfjlalkyyjldxhhycstdywncjtxywdrmdrqhwqcmfjdyzmhmayxjwmyzqsxtlmrspwwchajbxtgcypxyyrrclmpamgkqjszyjrmyjsnxtplnbappypylxmyzkynldgyjzczhnlmzhhanqmpgwqtzmxxmllhgdzxyhxkrxycjmffxyhjfsbssqlhxndycannmtcjcyprrnytyqnyymbmsxndlylysljnlqyshqmllyzlzjjjkymzcsfbzxxmstbjgnxyzhlsnmcqscyznfzlxbrnnnylmnrtgzqysatswryhyjzmzdhzgzdwybsscskxsyhytsxgcqgxzzbhyxjscrhmkkbsczjyjymkqhzjfnbhmqhysnjnzybknqmcjgqhwlsnzswxkhljhyybqcbfcdsxdldspfzfskjjzwzxsddxjseeegjscssmgclxxkywyllymwwwgydkzjgggtggsycknjwnjpcxbjjtqtjwdsspjxzxnzxwmelptfsxtllxcljxjjljsxctnswxlehhlyqrwhsycsqrybyaywjejqfwqcqqcjqgxaldbzzyjgkgxpltqyfxjltpadkyqhpmatlcpdhkxmtxybhblefxdleegqdymsawhzmljtwyqxlyjzljeeyxbqqffnlyxrdsctgjgxyylkllxqkcctlhjlqmkkzgcyygllljdzgydhzwxpysjbzkdzgyzzhywyfqytyzszyezklymhjjhtsmqwyzlkyywzcsrkqyqltdxwcdrjklwsqzwbdcqyncjsrszjlkcdcdtlzzzacqqczddxyplxcbqjylzllljddzjgyjyjzyxnyyynxjxkxdazwyrdljyyyrjlglldrxjcykywnqcclddnyyykyckczhjxcclgzqjgjwppcqqjysbzzxyjxjbxjfzbsbdsfnsfpzxhdwztdmpptblzzbzdmyypqjrsdzsqzsqxbdgcpzswdwcsqzgmdhzxmwwfybpdgphtmjthzsmmbgzmbzjcfzhfcbbzmqcfmbcmcjxlgpnjbbxgyhyyjgptzgzmqbqdcgybjxlwzkydpdymgcftpfxyztzxdzxtgkmtybbclbjaskytssqyymscxfjeglsllszbqjjjaklyldlycctsxmcwfgkkbqxlllljyxtyltyxytdpjhnhgnkbyqnfjyyzbyyessessgdyhfhwtcjbsdzjtfdmxhcnjzymqwsrxjdzjqpdqbbsdjggfbkjbxdgjhmgwjjjgdllthzhhyyyyyysxwtyyyccbdbpypzyccztjpzywcbdlfwzcwjdxxhyhlhwczxjtczlcdpxdjczczlyxjjsjbhfxwpywxzptdzzbdccjhjhmlxbqxxbylrddgjrrctttgqsczwmxfytmwzcwjwxjywcskybzqccttqnhxnkxxkhkfhtswoccjybcmpzzyjbnnzpbthhjdlscddytyfjpxyngfxbyqxcbhxcbsxtyzdmzysnxsxlhkmzxlthdhkghxjsshqyhhcjyxglhzxcsnhekdtgqxqypkdhextykcnymyyypkqyytjxzlthhqtbyqhxbmyhsqckwwyllhcyylnneqxqwmcfbdccmljggxdqktlxkgnqcdgzjwyjjlyhhqtttnwchhxcxwheszjydjccdbqcdgdnyxzdhcqrxcbmztqcbxwgqwyybxhmbymykdyecmqkyaqyngyzslfykkqgyssqyshjgjcnxkzycxsbkyxhyylstycxqthysmgscpmmgcccccmtztasmgqzjhklosqylswtmqsyqkdzljqqyplcycztcqqpbbqjzclpkhqcyyxxdtdddsjcxffllchqxmjlwcjcxtspycxndtjshjwxdqqjckxyamylsjhmlalykxcyydmamdqmlmcznnyybzkkyflmchcmlhxrcjjhsylnmtjggzgywjxsrxcwjgjqhqzdqjdzjjzkjkgdzqgjjyjylhzxxcdqhhhestmhlfsbdjsyyshfyssczqlpbdrfrztzdkykgsctgkwdqzrkmsynbcrxqbjyfaxpzzedzcjykbcjwhyjbqdzywnyszptdkzpfpbaztklqyhbbzpnbptyzzybhnydcpjmmcycqmcjfzzdcmnlfpbplngqjtbttajzpzbbdnjkljqylnbzqhksjznggqsczkyxchpzsnbcgzkddzqanzgjkdntlzldwjljzlywtxndjzjhxyatncbgtzcsskmnjpjytsrwxcfjwjjtkhtzplbhsnjzsyjbwbzyzlstlsbjhdwwqpslmmfbjdwajyzccjtbnnrzwqxcdslqgdsdpdzhjtqqpsqlyyjzlgyhszlctcbjtktyczjtqkbpjlgmjzdmcsgpynjzjjyyknhrpwszxmtncszzyxybyhyzaxywkcjtllckjjtjhgcxdxyqyczbywblwqcglzgjgqrqcczssbcrbcskydznljsqgxssjmecnstztpbdlthzwhqwqtzexnqczgweskssbybstscsjccgbfsdqszlccglllzghzcthcnmjgyzaznmckcstjmmzckbjygqljyjppldxrgzyxccsnhshgdznlzhzjjcddcbcjflbfqbczzwpqdnhxljcthqwjgylnlszzpcjdscqqhjqkdxkpbajyemsmjtzdxlcjyryynwjbngzzkmjxltbsllrtpylcsznxjhllhyllqqzqlxymrcwcxsljmczltzldwdjjllnzggqxppskygyggbfzpdkmwghcxmcgdxjmcjsdycabxjdlnbcddygskydjtxdjjyxmsaqazdzfslqxyjsjzylblxxwxqqzbjzlfbblylwdsljhxjyzjwtdjcyfqzqzzdcsxzzqlzcdzfchyspympqzmlpplffxjjnzzylsjyyqzfpfzksywjjjhrdjzzxtxxglghtdxcskyswmmtcwybazbjkshfhgcxmhfqhyxxyzftsjyzbxyxpzlchmzmbxhzzssyfdmncwdabazlxktcshhxkxjjzjsthygxsxyyhhhjwxkzxcsbzzwwhhcwtzzzpjxsnxqqjgzyzawllcwxzfxgyxyhxmkyyswsqmnjnaycyspmjkgwcqhylajjmzxhmmcnzhbhxclxtjpltxyjhdyylttxfszhyxxsjbjyayrsmxyplckdlyhlxrlnllstyzyyqygyhhsccsmcctzcxhyqfpyyrpfflfqtntszllzmhwtcjqyzwtllmlmdwmbzssmzrbpdddlgjjbxccsrzqqygwcsxfwzlxccrbtdzmcyggdlqsgtjmwljmymmsyhfbjdgyxccpshxczcsbsjwjgjmpbwaffyfnxhydxzylremzgzcyhsszdlljcsqfzxxkptxzgxjjgbmyyysnbdylbnlhbfzdcyfbmgqrrmsszxysgtznnydzzcdgbjafjbdknzblcsscpsgzycjszlmlrzzbzzldlsllysxsqzqlyxzlsgkbrxbrbzcycxzjzeeyfgklzlyyhgysgzlfjhgtgwkraajyzkzqtsshjjxdzyz桛yjlzyrzdqqhgjzxsszbtkjpbfrtjxllfqwjgslqtymblpzdxtzagbdhzzrbgjhwnjtjxlhscfsmwlldqysjtxkzscfwjlbxftzlljzllqblcqmqqcgcdfpbbhzczjlpyygjdtgwdcfczqyyyqysrclqzfklzzzgffsqnwglhjycjjczlqzcyjbjzzbpdccmhjgxdqdgdlzqmfgpsytsdyfwwdjzjysxyycjcyhzwpbyhxrylybhkjksfxtzjmmchhlltnyymsxxyzpyjjycdyzwmtjjkqyrhllqxpsgtlwycljscbxjyzfnmlrgjjtyzbsyzmsjyjhgfzqmsyxrszcwtlrtqzsstkxgqggsptgcdnjsgcqcqhmxggztqydjkzdlbzsxjlhyqgggthqscpyhjhhgnygkggcmjdzllcclxqsftgzslllmlcskctbljzzszmmnytpzsxqhjcjyqxyexzqzcpshkzzysxcdfgmwqrllqxrfztlysdctmjcsjjdhjnxtnrztzfqrhqgllgcxszsjdjljcytsjtlnyxhszxcgjzyqpylfhdjsbpcczgjjjqzjqdybssllcmyttmqtbhjqnnygkynqyqmzgcjkpdcgmyzhqllsllclmholzgdylfzsljcqzlylzcjeshnylljxgjxlyjyyyxnbcljsswcqqcjyllcldjyllzllbnylgqchxyyqoxccqkyjxxhyklksxayqccqkkkkcsgyxxyqxygwtjohthxpxxcsshcyeychzzcbwqbbwjqcscszsslzylgdesjzmmymcytsdsxxscjpqqsqylyfzychdjdzywcbtjsydjhcyddjlbdjjsodzyqysqkxxdhhgqjyohdyxwgmmmajdybbbppbcmhcpljzsmtxerxjmhqdstpjdcbssmsssthjtslmmtrcplzszmlqdsdmjmqpnqdxcfynbfsdqqyxhyaykqyddlqyyysszbydslntfgtzqbzmchdhczcwfdxtmqqsphqwwxsrgjcwtjtzzqmgwjjrjhtqjbbgwzfxjhnqfxxqywyyhyscdydhhqmnmdmmcpbszppzzglmzfollcfwhmmsjzttthlmyffytzzgzyskjjxqyjzqphmbzzlyghgfmshpcfzsnclpbqsnjszslxjfpmtyjygbxlldlxpzjypjyhhzcywhjylsjexfsszywxkzjlladtmlymqjpwxxhxsktqjezrpxxzghmhwqpwqlyjjqjjzszcfhjlchhnxjlqwzjhbmzyxbdhhypylhlhlgfwlcfyytlhjjcjmscpxstkpnhjxsntyxxtestjctlsslstdlllwwyhdhrjzsfgxssyczykwhtdhwjslhtzdqdjzxxqggyltzphcsqfzlnjtclzpfstpdynylgmjllycqhynsbchylhqyqtmzybbywrfqykjsyslzdyjmpxyyssrhzjnyqtqdfzbwwdwwrxcwhgyhxmkmyyyhmsmzhngcepmlqqmtcwctmhmxjpjjhfxyyzsjzhtybmstsyjdtjjqytlhynbyqzlcxcnzwsmylkfjxlwgbypjytysylymzckttwlgsmzsylmpwlzwxwqzssaqsyxyrhssntsrapccpwcmgdhhxzdzxfjhgzttsbjhgyglzysmyclllybtyxhbbzjkssdmalhhycfygmqypjycqxjllljgclzgqlycjcctotyxmtmshllwcgfxymzmklpszzzxhhjyslctyjcyhxsgyxzkxlzwpyjpdhjwpjpwsqqxlxxdhmrslzcyzwstcxkystzshbsccstplwsscjchjlcgchssphylhfhhxjsxyllnylmzdhzxylsxlwzyhcldyahzcmddyspjtqjzlngjfsjshctsdszlblmssmnyymjqbjhrcwtyydchqljapzwbgqybkfcmjwlzllyylszydwhxpsbcmljpscgbhxlqhyrljxyswxhxzlldfhlslymjljyflyjycdrjlfsyzfsllcqyqfgjyhyszlylmstdjcyhbzllnwlxxygyyhbmgdhxxhhlzzjzxczzzcyqzfnjwpylcpkpykpmclgkdgxzggwqbdxzzkzfbxxlzxjtpjpttbytszzdwslchzhsltjxhqlhyxxxywzyswtmzkhlxzxzpyhgchkjfsyh烪tjrlxfjxptztwhplyxfcrhxshxkjxxyhzjdxjwylhyhmjdbflkhtxcwhcfwjcfpqrxqxcyyyjygrpxgscsxngwchkzdxhflxxhjjbyzwtsxnncyjjymswzjqrmhxzwfqsylzjzgbhynslbgttcsebhxxwxyhhxyxnsqyxmlywrgyqlxbbcljsylpsytjzyhyzawlhorjmksczjxxxyxchcytryxqjddsjfslyltsffyxlmtyjmjjyyyxltzcsxqzlhzxlwyxzhdnlrxhxjcdyhlbrlmbrllaxksllljlyxxlycrylcjcgjcmtlzllcyzzpzpcyawhjjfybdyyzsepckzdqyqpbpcjpdcyzbdbbcyydycnnpjmtmlrmfmmgwygbsjgygsmdqqqztxmkqwgxllpjgzbqcdjjjfpkjkcxbljmswmdtqjxldlppbxcwkcqqbfqjczagzgmykbhyyhzykndkzmbpjyspxthlfpnyygxjdbkxnhhjhzjxstrstldxskzysybmxjlxyslbzyslhxjpfxbqnbylljqkygzmcyzzymccsldlhzgwfwyxzmwcxtynxjhbyymcysbmhysmydyshqyzchmjjmzcaahcbjbbhplxtylsxsdjgjdhkxxtxxnbhnmlngsltxmrhnlxqjxmzllyswqgdlbjhdcgjyqycmhwfwjybbbyjmjwjmdpwhxqldyapdfxxbcgjspckrssyzjmslbzzjfljjjlgxzgyxyxlszqyxbexyxhgcxbpldyhwecdwwcjmbtxchxyqxllxflyxlljlssfwdpzsmyjclmswtczbchqekcqbwlcgydblqppqzqfjqdjhymmcxtxdrmjwrhxcjzclqxdyynhyyhrslsrsywwzjymtltllgzqcjzyabsckzcjyccqljsqxalmzyyywlwdxzxqdllqshgpjfjljhjabcqzdjgthhsstcyjlbswzlxzxrwgldlzrlzqtgsllllzlymxqgdzhgbdbhzpbrlw瓧xqbpfdwo瓰瓱whlypcbjcc瓼dmbzpbzz甅cyqxldomzblzwpdwyygdstthcsqsccrsssyslfybfntyjszdfndpthtzzmbblxlcmyffgtjjqwftmdpjwdnlbzcmmctgbdzlqlpyfhsymjylsdchdzjwjcctljcldtljjcpddpjdsszynndbjlggjzxsxnlycybjjqxcbylzcfzppgkcxzdzfztjjfjsjxzbnzyjqttyjwhtyczhymdjxttmpxsflzcdwslshxybzgtfmlcjtacbbmgdewycyzcdszcyhflyctygwhkjyylsjcxgywjcbhlcsnddbtzbsclyzczzssqdllmqyyhfllqllxfdyhabxggnywyypllsdldllbjcyxjzmlhljdxyyqytdlllbbgbfdfbbqjzzmdpjhgclgmjjpgaehhbwcqxaxhhhzchxyphjaxhlphjpgpzjqcqzgjjzzgzdmqyybzzphyhybwhazyjhykfgdpfqsdlzmljxjpgalxzdaglmdgxmwzqytxdxxpfdmmssympfmdmmkxksyzyshdzkjsysmmzzzmsydnzzczxbmlstmddnmxckjmztyymzmzzmsshhdccjemxxkljstgwlsqlyjzllsjssdbpmhnlyjczyhmxxhgzcjmdhxtkgrmxfwmckmwkdcksxqmmmfzzydkmsclcmpcgmwrpxqpzdsslcxkyxtmlgjyahzjgzqmcsnxyhmmpmlkjxmhlmlgmxctkzmjjyszjsyszhsyjzjcdajzybsdqjzgwzkgxfkdmsdjlfmehkzqkjbeypzyszcdwyjffmzjykttdzzefmzlbnpplplpbpszalltylkckqzkgenqlwagxxydpxlhsxqqwqykxqclhyxxmlyccwlymqyskychlcjnszkpyzkcqzqljbdmdjhlasqlbydwqlwdnbqcrydddtjybkbwszdxdtnpjdtctqdfxqqmgnseclstbhpwslctxxlpwydzklzygzcqapllkccylbqmqczqcljslqzdjxldthpzqdljjxzqdjyzhkzljcyqdyjppypeakjyrmpcbymcxkllzllfqpylllmbsglcysslrsysqtmxyxqqzbdzrysyztffmzzsmzqhzssccmlyxwtpzgxzjgzgsjsgkddhtqggzllbjdzlcbzhyxyzhzfywxyzymsdbzzyjgtsmtfxqyxjscdgslnmdlrytzlryylxqhtxsrtzcgyxbnqqzfhykmzjbzymkbpnlyzpblmcnqyzzzsjzhjctzhhyzzjrdyzhnfxglfxslkgjtctssyllgzrzbbjzzklpkbczyslxyxbjfpnjzzxcdwxzyjxzzdjjgggrsrjkmcmzjlsjywqshyhqjsxpjzzzlsnshrnypjtwchklbsrzlcxwjqxqkysjycztlqzybbybwzjqdwgyzcytjcjxckcwdkkzxsgkdzxwwyyjqyytcytdjlxwkczkklcclzcqqdzlqlcsfqchqhsfsmqzzllbjjzbsjhtsjdysjqjpdlzcdcwjkjzzlpycgmzwdjjbsjqzsyzyhhxcbbjydssddzncglqmbtsfcbfdzdlznfgfjgfsmptjqlmblgqcyyxbqkdxjqsrfkztjdhczklbsdzcfytplljgjhtxzcsszzxstcygkgckgyoqxjplzbbbgtgyjdgczqszlbjlsjfzgkqqjcgyczbzqtldxrjxbsxxpzxhyzyclwdsjjhxmfczpfzhqhqmqgkslyhtycgfrzgnqxclpdlbzcsczqlljblhbdcypczppdymtzsgyhckcpzjgslclnscdsldzxbmsdlddfjmkdjdhslzxlszqpqpgjllybdszgqlbzlslkyyhzttncjyqtzzfszqztlljtyyllqllqyzqlbdzlslyyzymdfszsnhlxznczqzbbwskrfbcyzmthblgjpmczzcstlxshtzcyzlzblfeqhlxflcjlyljqcbzlzjghsstbrmhxzhjzclxfnbgxgtqjcztmsfzkjmssnxljkbhszxntnlzdntlmsjxgzjyjczxyhyhwrwwqnztnfjscpzshzjfyrdjsfscjzbjfzqzchzlxfxsbzqlzsgyftzdcszxzjbqmszkjrhxjzcgbjkhchgtjkjqglxbxfgdrtylxjxgdtsjxhjzjjcmzlcqsbtxhqgxttxhxftsdkfjhzyjfjxrzcdlllcqsqqzqwqxswqtwgwbzcgcllqzbclmqqtzgzxzxljfrmyzflxysqxxjkxrmjdcdmmyxbsqbhgcmwfwtgmxlzbyytgzyccdxyzxswgxyjyznbgpzjcqsyxcxrtfycgrhztxszzthcbfclsyxzljqmzlmplmxzjssflbysmyqhxjsxrxsqzzzsslyflczjrcrxhhzxqydshxsjjhzcxjbdynsysxjbqlpxzqpymlxzkyxlxcjlcycrxzzlldlllsjyhzxgyjwkjrwyhcpsgnrzlfzwfzznsxgxflzsxzzzbfcsyjdbrjkrdhhgxjljjtgxjxxstjtjxlyxqfcsgswmsbctlqzzwlzzkxjmltmjyhsddbxgzhdlbmyjfrzfcgclyjbpmlysmsxlszjqqhjzfxgfqfqbpxzgyyqxgztcqwyltlgwwgwhllfsfgzjmgmgbgtjfsyzzgzyzaflsspmlbflcwbjzcljjmzlpjjlymqdmyyyfbgygqzglyzdxqyxrqqqhsxyyqqygjtyxfsfsllgnqcygycwfhcccfxbylypllzqxxxxxkqhhxshjdcfdsczjxcpzwhhhhhapylhalpqafyhxdyllkmzqgggddesrnndltzgchybpysqjjhclljtolnjpzljlhymheydydsqycddhgzpndzclzywllznteytgxlhslpjjbdgwxpcdntjcklkclwkllcasstknzdnqnttlyyzssysszzryljqkcgbhhcrxrzydgrgcwcgzhfffppjfzynakrgywyqpqxxfkjtszzxswzddfbbqtbgtzfznpzfpzxzpjszbmqhkcyxyldkljnypkyghgdcjxxeahpnzgctzcmxcxmmjxnkszqnmnlwbwwxjjyhclstmcsqdjcxxtpcnpdtnnpglllzcjlspblplkcdtnjnlyyrscffjfqwdpgzdwmnzcclodaxnssnyzrestyjwjyjdbcfxnmwttbqlwstszgybljpxglboclgpcbjftmxzljylzxcltpnclcgxtfzjshcrxsfyszdkntlbyjcyjllstgqcbxnwzxbxklylhzlqzlnzcqwgzlgzjncjgcmnzzgjdzxtzjxycyycxxjyyxjjxsssjstssttppghtcsxwzdcsyfptfbchfbblzjclzzdbxgcxlqpxkfzflsyltywbmnjhskbmddbcysccldxycddqlyjjhmqllcsgljjsyfpyyccyltjantjjpwycmmgqyysqdhqmzhszxpftwwzqswqrfkjlxjqqyfbrxjhhfwjgzyqacmyfrhcyybyqwlpexcczstyrltsdmqlykmbbgmyyjprknnbbsxyxbhyzdjdnghpmfsgbwfzmfjmmbcmzzcjjlcnyxyqgmlrygqccyhzlwjgcjcggmcjjfyzzjhycfrrcmtzqzxhfqgdjxccjeaqcrjthpljlszdjrbcqhjdzrhxlyxjsymhzydwldfryhbbydtssccwbxglpzmlzztqsscpjmmxjcsjytycghycjwsnsxlfemwjnmkllswtxhyyygcmmcwjdqdjzglljwjnkhpzggflccsczmcbltbhbqjxqdjpdjqtghglfqawbzyjjltstdhqhctcbchflqmpwdshyytqwcnztjtlbypbpdyyyxsqkxwyyflxxncwcxybmaelykkjmzzzbrxyaqjfljpfhhhytzzxrgqqmhspgdzjwbwpjhzjdyscqwzkthxsqlzyymysdzgrxckkhjlwpysyscsyzlrmlqsyljxbcxtlhdqzpcycykpppnsxfyzjjrcemhszmsxlxglrwgcstlrsxbygbzgztcpldjlslylymdtmtcpalcxpqjcjwtcyyzlblxbzlqmyljbghdslssdmxmbdczsxwhamlczcpjmcnhjyjnsygchskqmzzqdllkablwjqsfmocdxjrrlyqchjmybyqlrhetfjzfrfksryxfjdwdsxxlwsqjyslyxwjhsnlxyyxhbhawhhjcxwmyljcsqlkydttxbzsxfdxgxsjhhsxxybssxdpwncmrptjzczenygcxqfjxkjbdmljcmqqxloxslyxxlylljdzbtymhbfsttqqwlhogyblscalzxqlhtwrrqhlstmypyxjjxmqsjpnbryxyjllyqylthylqyfmhkljdmllhfzwkzhljmlhljkljstlqxylmbhhlnlsxqchxcfxxlhyhjjgbyzzkbxscqdjqdsxjzsyhzhhmgsxcsymxfebcqwwrbpyyjqtyqcyjhqqzyhmwffhgzfrjfcdbxndqyzpcyhhjlfrzgppxzdbbgzqstlgdgylcqmgchhmfywlzyxkjlypqhsywmqqgqzmlzjnsqxjqsyjtcbehsxfssfxzwfllbcyyjdytdthwzsfjmqqyjlmqsxlldttkhhybfpwdyysqqrnqwlgwdebdwcyygcdlkjxtmxmyjsxhybrwfymwfrxyqmxysctzztfykmldhqdlwyqnlcryjblpsxcxywlsbrrjwxhqybhtydnhhgmmywytzcsqmtssccdalwztcpqpyjllqzyjswxwzzmmglmxclmxczmxmzsqtzppjqblpgxjzhfljjhycjsnxwcxsccdlxsyjdcqcxslqyclzxlzzxmxqrjmhrhzjphmfljlmlclqnldxzlllfypngjysxcqqdcmqjzzxhnpnxzmekmxxykyqlxsxtxjxyhwdcwdzhqyybgybcyscfgfsjnzdyzzjzxrzrqjjymcanhrjtldbpyzbstjhxxzypbdwfgzzrpymtngxzqbyxmbbfcckrjjjbjegrzgyclkxzdxkknsjkcljspgyyzlqqjybzssqlllkjfcbktylcccdblsppfylgydtzjyqggkqttfcxbdkdxxhybbfytyhbclpdytgdhryrnjsbtcsnyjqhklllzslydxxwbcjqsbxbfjzjcjdzfbxxbrmlazgcsnclbjdstblfrzdswsbxbcllxxlzdjzsjpylyxxyftfffbhjjjgbygjpmmmmsscljmtlyzjxswxtyledqpjmygqzjgdjlqjwjqllsdgjgygmscljjxdtygjqjqjcjzcjgdzdshqgsjggcjhqxsnjlzzbxhsgzxcxyljxyxyydfqqjhjfxdhctxjyrxysqtjxyefyyssyxjxncyzxfxcsyszxyyschshxzzzgzzzgfjdldylnpzgyjyzyyqzpbxqbdztzczyxxyhhscxshcggqhjhgxwsztmzmehyxgebtylzkkwytjzrclekestdbcykqqsayxcjxwwgsbhjszsdhcsjkqcxswxfctynydpzcczjqtzwjqdzzzqzljchlsbhpydxpsxshhezdxfptjqyzzxhyaxncfzyyhxgnqmywxtzsjpkhhgymxmxqcxtsbcqsjyxhtyylybcqlmmszmjzjllcogxzaajzyhjmchhcxzsxzdznleyjjzjbhzwzzsqtzpsxztdsxjjjznyazphhyysrnqdthzhayjyjhdzxzlswclybzyecwcycrylcxnhzydzydyjdfrjjhtrsqtxyxjrjhojynxelxsfsfjzghpzsxzszdzcqzbyyklsgsjhczshdgqgxyzgxchxzjwyqwgyhksseqzzndzfkwyssdclzstsymcdhjxxyweyxczaydmpxmdsxybsqmjmzjmtzqlpjyqzcgqhxjhhhxxhlhdldjqsldwbsxfzzyyschtytyjbhecxhjkgjfxbhyzjfxbwhbdzfyzbcapnpgnydmsxhkhhmamlnbyjtmpxyjmcthjbzyfcgtyhwphftgzzezsbzegpbmdskftycmhbllhgpzjxzjgzjyxzsbbqsczzlzccstpgxmjsftcczjzdjxcybzlfcjsyzfgszlybcwzzbyzdzypswyjgxzbdsysxlgzbzfygczxbzhzftpbgzgejbstgkdmfhyzzjhzllzzgjqzlsfdjsscbzgpdlfzfzszyzyzsygcxsntxchczxtzzljfzgqsqyxzjqccccdjcdxzjyqjccgxztdlgscxzsyjjqtcclqdqztqchqqjztezzzpbkkdjfcjfztybqyqttynlmbdktjcpqzjdzfpjsbnjlgyjdxjdzqkzgqkxclpzjtcjdqbxdjjjstcjnxbxcmslyjcqmtjqwwcjjnjnlllhjcwqtbzqyczczpzzdzyddcyzdzccjgtjfzdprntctjdcqtqndtjnplzbcllctdsxkjzqdpzlbznbtjdcxfczdbccjjltqjpldcgzdbbzjcqdcjwynllzlzccdwllxwzlxrsntqjccxkjlsgdfqtddglrlajjtklymkqlldzytdyycygjwyxdxfrskstcdenqmrkqzhhqkdldazfkypbggpzrebzzykyzspegjjglkqzzzslysywyzwfqznlzzlzhwcgkypqgnpgblplrrjyxcccgyhsfzfwbzywtgzxyljczwhxzjzblfflgskhyjzeyjhlpllllcygxdrzelrhgklzzyhzlyqszzjzqljzflnbhgwlczcfjwspyxnlzlxgccpzbllcxbbbbxbbcbbcrnncccyrbbsyldcgqyyqxygmqzwtzydyjhyfwdehzdjywlccntzyjjcdedpzdztstqjhdymbjnyjzlxtsstphndjxxbyxqtzqddtjtdyztgwscszqflshlglbcjbhdlyzjyckwtydylbnydsdsycctyszyyebgexhqddwnygyclxtdcystqmygzasccszzddlcclzrqxyyeljsbymxshztembbllyyllytdqyshymrqxkfkbfxnxsbychxbwjyhtqbpbsbwdzylkgzskyghqzjhhxjxgnljkzlyycdxlfwfghljgjybxblybxqpqgztzplncybxdjyqydymrbesjyyhkxxstmxrczzywxyhybmcflyzhqyzmqxdbxbzwzmslpdmyckfmzklzcyjycclhxfzlydqzpzygyjyzmzxdzfyfyttqtchgspczmlccytzxjcytjmkslpzhysnwllytpzctzzcktxdhxxtqcypksmqccyyazhtjpcylzlyjbjxtfnyljyynrxcylmmnxjsmybcsysslzylljjgyldzdpqbfzzblfndsqkczfhhhgqmrdsxycstxnqqjpyjbfcxdyqfbnxejdgyqbsrcnfyyqpghyjdyzxgrhtkyleqdzntsmgklbsgbpyszbytjzsszjcssxzbhbscsbzczptqfzmqflypybbjgszmxxdjmthyskkbjtxhjcegbsmjyjzcxtmljyxrzzqscxxqptzxmkyxxxjcljprmyygadyskqlsadhrskqxzxztcghztlmlwxybwsycdbhjhcfcwzsxhytkzlxqshlyczjxemplprcgltbzztlzjcyjgdtclglpllqpjmzpapxyzlaktkdnczzbnzctdqqzjyjgmctxltgcszlmlhbglkfwnwzhdxphlfmkydlgxdtwzfrjejctzhydxykshwfzcqshktmqqhtchymjdjskhxzjzbzzxympajqmsdbxlsklyynwrtsqlscbpdbsgzwyhtlkssswhzzlyytnxjgmjszsxfwnlsoztxgxlsammlbwldszylakqcqctmycfjbslxclzjclxxksbzqclhjphqplsxsckslnhpsfqqytxjjzlqldxzjjzdyydjnzptfcdskjfsljhylzqjzlbthydgdjfdbyazxdzhzjnhhqbyknxjjqczmlljzkspldsclbblxklelxjlbjycxjxgcnlcqplzlznjtzljgyzdzpltqcssfdmnycxgbtjdcznbgbqyqjwgkfhtnbyqzqgbkpbbyzmtjdytblsqmbsxtbnpdxklemyycjynzdtldykzzxddxhqshdgmzsjycctayrzlpwltlkxslzcggexclfxlkjrtlqjaqzncmbqdkkcxglczjzxjhptdjjmzqykqsecqzdshhadmlzfmmzbgntjnnlgbyjbrbtmlbyjdzxlcjlpldlpcqdhlhzlycblcxzcjadqlmzmmsshmybhbskkbhrsxxjmxsdznzpxlbbragggfchgmsklltsjyycqlcskywyehywhbhqywbawykqldqftntkhqcgdqktgpkxhcpdhtwtmssyhbwcrwxhjmkmzngwtmlkfghkjyldyycxwhyeclqhkqhtdqhhffldxqwgzyydesbpkyrzpjfyyzjceqdzzdlattbbfjllcxdlmjsdxegygsjqxcfbxsszpdyzcxdnyxpfzydlyjccpltxlsxyzyrxcyysdylwwndsahjsygyhgywkaxtjzdaxysrltdjssaxfnejdxyzhlxlllzhzsjnyqyqqxyjghzgjcyjchzlycdshwsgczyjxcllnxzjjyyxnfsmwfpylcyllabwddhwdxjmcxztzpmlqzhsfhzynztlldywlslxhymmylmbwwkyxyadtxylldjpybpwfxjmmmllhafdllaflbhhhbqqjtzjcqjjdjtffkmmmbythygdcqrddwrqjxnbysnmzdbyytbjhpybygtjxaahgqdqtmystqxkbtsbkjlxrbeqqhqmjjbdjwtgtbxpgbktlgqxjjjcdhxqdwjlwrfmqgwqhckryswgbtgygbwsdwdwrfhwytjjxxxjyzyslphyypayxhydqkxshxyxeskqhywbdddpplcjlhqeewxksyyhdyplfjthkjltcyyhhjttpltzzcdlthqkcxqysteeywkyzyxxyysddjkllpwmcyhqgxyhcrmbxpllnqydqhxsxxwgdqbshyllpjjjthyjkyphthyyktyezyenmdshlcrpqfbgfxzbsbtlgxsjbswyysksflxlpplbbblbsfxfyzbsjssylpbbffffsscjdstzsxtryjcyffsytyzbjtbctsbsdhrtjjbytcxyjeylxcbnebjdsysyhgsjzbxbytfzwgenyhhthjhatfwgcstbgxklstywmtmbyxjskzscdyjrcytwxzfhmymcxlznsdjtttxrycfyjsbsdyerxhljxbbdeynjghxgckgscymblxjmsznskgxfbnbbthfjaafxyxfpxmyfhdtzcxzzpxrsywzdlybbjtyqwqjpzypzjznjpzjlztfysbttslmptzrtdxqsjehbzylzdhljsqmlhtxtjecxalzzspktlzkqqyfsygywpcpqfhqhytqxzkrsgtgsqczlptxcdyyzssqzslxlzmacbcqbzyxhbsxlzdltcdjtylzjyytpzylltxjsjxhlbmytxcqrblzssfjzztnjydxmyjhlhpblcyxqjqqkzzscpzkswalqsblcczjsxgwwwygyatjbbctdkhqhkgtgpbkqyslbxbbckbmllxdzstbklggqkqlsbkkdfxrmdkbftpzfrtbbmferqgxkjpzsstlbzdpszqzsjthljqlzbpmsmmsxlqqnhknblrddnhxdhddjcyygyfqgzlgsygmjqgkhbpmxyxlytqwlwgcpbmjxcyzydrjbhtdjxeeshtmjsbyplwhlzffnypmhxqhpltbqpfbcwjdbygpnxtbfzjgsddtjshxeawzzyllttybwjkgxghlfkxdjtmszsqynzggswqsphtlsskmclzxyszqzxncjdqgzdlfnykljcjllzlmzznhydsshthxzlzzbbhqzwwycrdhlyqqjbeyfsgxthsrxwqhwfslmssgzttyeyqqwrslalhmjtqjsmxqbjjzjxzyzkxbyqxbjxshzssfglxmxzxfghkzszggylclsarjxhslllmzxelglxydjytlfbhbpnlyzfbbhptgjkwetzhkjjxzxxglljlstgshjjyqlqzfkcgnndjsszfdbctwwseqfhqjbsaqtgypjlbxbmmywxgslzhglzgnyfljbyfdjfrgsfmbyzhqfbwjsyfyjjphzbyyzffwodgrlmftmlbzgycqxcdjygzyyyytytydwegazyhxjlzythlrmgrjxzclhneljjthtbwjybjjbxjjtjteekhwsljplpsfazpqqbdlqjjtyyqlyzkdksqjyyjzldqcgjjyzjsycmraqthtejmfctyhypkmhycwjdcfhyyxwshctxrljgjshccyyyjltkttytmxgtcjtzayyoczlylbszywjytsjyhbyshfjlygjxxtmzyyltxxypclxyjzyzyypnhmymdyylblhlsyygqllnjjymsoycbzgdlyxylcqyxtszegxhzglhwbljgeyxtwqmakbpqcgyshhegqcmwyywljyjhyyzlljjylhzyhmgsljljxcjjyclycjpcpzjzjmmylcjlnqljjjlxxjmlszljqlycmmhcfmmfpqqmfxlqmcffqmmmmhmznfhhjgtthhkhslnchhyqdxtmmqdcydyxyqmyqylddcyyydazdcymzydlzfffmmycqcwzzmabtbyctdmndzggdftypcgqyttssffwbdtzqssystwjjhjytsxxylbyqhwwhxezxwznnqzjzjjqjccchyyxbzxccyjtllcqxknjycyycynzzqyyoewyczdcjycchyjlbtzkycqwlpgpyllgkdldlgkgqbgychjxy';
  // 汉字 → 拼音首字母
  function charInitial(ch) {
    var cp = ch.charCodeAt(0);
    if (cp >= 0x4E00 && cp <= 0x9FA5) {
      var c = PINYIN_INITIALS.charAt(cp - 0x4E00);
      if (c && c !== '0') return c;
    }
    return '';
  }
  // 姓名 → 拼音首字母串（如 郭文进 → gwj）
  function nameInitials(name) {
    var s = '';
    String(name == null ? '' : name).split('').forEach(function (ch) {
      var c = charInitial(ch);
      if (c) s += c;
    });
    return s;
  }
  // ---- 全拼支持（GB2312 一级汉字 + 常见字，按 Unicode 码点索引二分查找）----
  function charFullPinyin(ch) {
    var cp = ch.charCodeAt(0) - 0x4E00;
    if (cp < 0 || cp > 0x51A5) return '';
    var lo = 0, hi = PY_CODES.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var c = PY_CODES[mid];
      if (c === cp) return PY_VALS[mid];
      if (c < cp) lo = mid + 1; else hi = mid - 1;
    }
    return '';
  }
  // 姓名 → 全拼串（如 于世豪 → yushihao）
  function nameFullPinyin(name) {
    var s = '';
    String(name == null ? '' : name).split('').forEach(function (ch) {
      s += charFullPinyin(ch);
    });
    return s;
  }
  // 拼音模糊匹配：kw 含字母时按姓名首字母匹配
  function pinyinMatch(name, kw) {
    var k = String(kw == null ? '' : kw).trim().toLowerCase();
    if (!k || !/[a-z]/.test(k)) return false;
    var full = nameFullPinyin(name);
    if (full && full.indexOf(k) !== -1) return true;
    var ini = nameInitials(name);
    if (!ini) return false;
    return ini.indexOf(k) !== -1;
  }

  // ---- 日期工具 ----
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // ---- 唯一 id ----
  var _seq = 0;
  function uid(prefix) {
    _seq += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + _seq;
  }

  // ---- 中文数字 → 阿拉伯数字（用于班号，支持 1~99）----
  var CN_DIGIT = { '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  function cnToNum(str) {
    if (str == null) return null;
    str = String(str).trim();
    if (str === '') return null;
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    // 处理“十、十一、二十、二十三、十二”等
    var total = 0;
    if (str.indexOf('十') !== -1) {
      var parts = str.split('十');
      var tens = parts[0] === '' ? 1 : (CN_DIGIT[parts[0]] != null ? CN_DIGIT[parts[0]] : null);
      var ones = parts[1] === '' ? 0 : (CN_DIGIT[parts[1]] != null ? CN_DIGIT[parts[1]] : null);
      if (tens == null || ones == null) return null;
      total = tens * 10 + ones;
      return total;
    }
    // 纯个位中文
    if (CN_DIGIT[str] != null) return CN_DIGIT[str];
    return null;
  }

  // 归一化班级写法：将“高一八班 / 高一8班 / 高一08班”统一成“高一8班”
  // 返回 { grade:'高一', classNo:8, label:'高一8班' } 或 null
  function parseClass(text) {
    if (text == null) return null;
    var s = String(text).replace(/\s+/g, '');
    // 格式1：高一1班 / 高一（1）班 / 高一(1)班（班在括号外，标准格式）
    var m = s.match(/^(高[一二三])[（(]?([0-9一二三四五六七八九十]+)[）)]?班$/);
    if (!m) {
      // 格式2：一（1）/ 二（1）/ 三（1）→ 补"高"前缀
      var m2 = s.match(/^([一二三])[（(]([0-9一二三四五六七八九十]+)[）)]$/);
      if (m2) m = ['', '高' + m2[1], m2[2]];
    }
    if (!m) {
      // 格式3：高一（1班）/ 高二(2班)（班在括号内，旧格式，兼容并转换）
      var m3 = s.match(/^(高[一二三])[（(]([0-9一二三四五六七八九十]+)班[）)]$/);
      if (m3) m = m3;
    }
    if (!m) {
      // 格式4：纯中文数字，如"一一""一十一""二十二""三十三"
      // 第一个中文数字为年级（一/二/三），后边为班级号中文数字
      var m4 = s.match(/^([一二三])([一二三四五六七八九十]+)$/);
      if (m4) m = ['', '高' + m4[1], m4[2]];
    }
    if (!m) return null;
    var grade = m[1];
    var classNo = cnToNum(m[2]);
    if (classNo == null) return null;
    return { grade: grade, classNo: classNo, label: grade + '（' + classNo + '）班' };
  }

  // 年级排序索引
  function gradeIndex(grade) {
    var i = GRADES.indexOf(grade);
    return i === -1 ? 99 : i;
  }

  // ---- CSV 解析（支持引号、逗号、换行、BOM）----
  function parseCSVRows(text) {
    if (text == null) return [];
    text = String(text).replace(/^\uFEFF/, ''); // 去 BOM
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQuotes = false; i++; continue;
        }
        field += ch; i++; continue;
      }
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\r') { i++; continue; }
      if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += ch; i++;
    }
    // 收尾
    if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
    // 去掉完全空行
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  // CSV 文本 → 对象数组（首行表头）
  function parseCSV(text) {
    var rows = parseCSVRows(text);
    if (rows.length === 0) return [];
    var header = rows[0].map(function (h) { return String(h).trim(); });
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var obj = {};
      for (var c = 0; c < header.length; c++) obj[header[c]] = rows[r][c] != null ? String(rows[r][c]).trim() : '';
      out.push(obj);
    }
    return out;
  }

  // 表头别名映射
  var HEADER_ALIAS = {
    'class': ['班级', '班', 'class', '行政班', '所在班级'],
    'name': ['姓名', '名字', 'name', '学生姓名'],
    'gender': ['性别', 'gender', 'sex'],
    'score': ['量化分', '量化', '分数', '分', 'score', '得分'],
    'boarding': ['走读住校', '走读/住校', '走读或住校', '住宿', '住校', '走读', 'boarding', '是否住校'],
    'area': ['区域', '宿舍区域', 'area', '区域名', '楼栋']
  };
  function pickField(row, field) {
    var aliases = HEADER_ALIAS[field];
    for (var k in row) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
      var key = String(k).trim().toLowerCase();
      for (var a = 0; a < aliases.length; a++) {
        if (key === String(aliases[a]).toLowerCase()) return row[k];
      }
    }
    return undefined;
  }

  // 归一化“走读/住校”：识别“走读”或“住校”；无法识别返回 ''
  function normalizeBoarding(raw) {
    if (raw == null) return '';
    var s = String(raw).trim();
    if (s === '') return '';
    if (s.indexOf('走读') !== -1) return '走读';
    if (s.indexOf('住校') !== -1 || s.indexOf('住宿') !== -1) return '住校';
    // 兼容 “是/否” 之类：含“否”视为走读（未住宿）？这里保守处理，无法识别返回 ''
    return '';
  }

  // 单行 → 学生对象；量化分缺省/非法 → 100
  function normalizeStudentRow(row) {
    var cls = pickField(row, 'class');
    var name = pickField(row, 'name');
    var gender = pickField(row, 'gender');
    var scoreRaw = pickField(row, 'score');
    var boarding = pickField(row, 'boarding');
    var score = 100;
    if (scoreRaw != null && String(scoreRaw).trim() !== '') {
      var n = Number(scoreRaw);
      if (!isNaN(n)) score = n;
    }
    var pc = parseClass(cls);
    var bd = normalizeBoarding(boarding);
    return {
      class: pc ? pc.label : (cls != null ? String(cls).trim() : ''),
      name: name != null ? String(name).trim() : '',
      gender: gender != null ? String(gender).trim() : '',
      score: score,
      boarding: bd || '住校' // 所有学生默认住校
    };
  }

  // 行数组 → 学生数组（带 id）；跳过无姓名的行
  function buildStudents(rows) {
    var out = [];
    (rows || []).forEach(function (row) {
      var s = normalizeStudentRow(row);
      if (!s.name) return;
      s.id = uid('s');
      out.push(s);
    });
    return out;
  }

  // 分数配色类名
  function scoreClass(score) {
    if (typeof score !== 'number' || isNaN(score)) return '';
    if (score < 20) return 'score-darkred';
    if (score < 60) return 'score-red';
    return '';
  }

  function studentGrade(cls) { var pc = parseClass(cls); return pc ? pc.grade : ''; }
  function studentClassNo(cls) { var pc = parseClass(cls); return pc ? pc.classNo : null; }

  // 姓名对齐：两个字中间加全角空格，三个字/四个字保持原样
  function formatName(name) {
    var s = String(name == null ? '' : name);
    if (s.length === 2) return s.charAt(0) + '　' + s.charAt(1);
    return s;
  }

  // 学生筛选
  function filterStudents(list, opts) {
    opts = opts || {};
    return (list || []).filter(function (s) {
      if (opts.grade && studentGrade(s.class) !== opts.grade) return false;
      if (opts.classLabel && s.class !== opts.classLabel) return false;
      if (opts.gender && s.gender !== opts.gender) return false;
      if (opts.keyword) {
        var kw = String(opts.keyword).trim();
        if (kw) {
          var hit = String(s.name).indexOf(kw) !== -1 || String(s.class).indexOf(kw) !== -1;
          if (!hit) hit = pinyinMatch(s.name, kw);
          if (!hit) return false;
        }
      }
      return true;
    });
  }

  // 学生排序（按年级→班号→姓名）
  function sortStudentsByClass(list) {
    return (list || []).slice().sort(function (a, b) {
      var ga = gradeIndex(studentGrade(a.class)), gb = gradeIndex(studentGrade(b.class));
      if (ga !== gb) return ga - gb;
      var ca = studentClassNo(a.class) || 999, cb = studentClassNo(b.class) || 999;
      if (ca !== cb) return ca - cb;
      return String(a.name).localeCompare(String(b.name), 'zh');
    });
  }

  // ---- 寝室号↔班级 对照表 ----
  var ROOM_ALIAS = ['寝室号', '寝室', '宿舍号', '房间号', '宿舍', 'room'];
  var DORM_AREAS = ['男寝', '女寝', '科技楼'];
  // 每寝默认容量（人）：普通寝室 8 人
  var DORM_CAPACITY = 8;
  // 大寝室：科技楼 301 / 401 / 421 每寝可住 20 人
  var DORM_BIG_CAPACITY = 14;
  var DORM_BIG_ROOMS = { '科技楼': ['301', '401', '421'] };
  // 按 区域+寝室号 取该寝室容量（人）
  function dormCapacity(area, room) {
    var bigs = DORM_BIG_ROOMS[area] || [];
    if (bigs.indexOf(String(room)) !== -1) return DORM_BIG_CAPACITY;
    return DORM_CAPACITY;
  }
  // 各区域寝室号清单（来自学校提供的寝室示意图：男寝/女寝/科技楼）
  var DORM_ROOMS = {
    男寝: ["101","102","103","104","105","106","107","108","109","110","111","112","113","114","115","116","201","202","203","204","205","206","207","208","209","210","211","212","213","214","215","216","217","301","302","303","304","305","306","307","308","309","310","311","312","313","314","315","316","317","401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416","417","501","502","503","504","505","506","507","508","509","510","511","512","513","514","515","516","517"],
    女寝: ["123","125","127","128","129","130","131","132","201","202","203","204","205","206","207","208","209","210","211","212","213","214","215","216","217","218","219","220","221","222","223","224","225","226","227","228","229","230","231","232","233","234","301","302","303","304","305","306","307","308","309","310","311","312","313","314","315","316","317","318","319","320","321","322","323","324","325","326","327","328","329","330","331","332","333","334","401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416","417","418","419","420","421","422","423","424","425","426","427","428","429","430","431","432","433","434","501","502","503","504","505","506","507","508","509","510","511","512","513","514","515","516","517","518","519","520","521","522","523","524","525","526","527","528","529","530","531","532","533","534"],
    科技楼: ["201","202","203","204","205","206","207","208","209","210","211","212","213","214","215","216","217","218","219","301","302","303","304","305","306","307","308","309","310","311","312","313","314","315","316","317","318","319","320","401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416","417","418","419","420","421"]
  };
  function pickBy(row, aliases) {
    for (var k in row) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
      var key = String(k).trim().toLowerCase();
      for (var a = 0; a < aliases.length; a++) if (key === String(aliases[a]).toLowerCase()) return row[k];
    }
    return undefined;
  }
  // 归一化区域名：只能为 男寝/女寝/科技楼 三者之一；无法识别返回 ''
  function normalizeArea(raw) {
    if (raw == null) return '';
    var s = String(raw).trim();
    if (s === '') return '';
    if (s.indexOf('男') !== -1) return '男寝';
    if (s.indexOf('女') !== -1) return '女寝';
    if (s.indexOf('科技楼') !== -1) return '科技楼';
    if (DORM_AREAS.indexOf(s) !== -1) return s;
    return '';
  }
  // 解析对照表行 → [{room, class, area}]；同一寝室号多行（多班级）保留多行，表示混寝
  function buildDormMapFromRows(rows) {
    var out = [];
    (rows || []).forEach(function (row) {
      var room = pickBy(row, ROOM_ALIAS);
      var cls = pickBy(row, HEADER_ALIAS['class']);
      if (room == null || String(room).trim() === '') return;
      var pc = parseClass(cls);
      out.push({
        room: String(room).trim(),
        class: pc ? pc.label : (cls != null ? String(cls).trim() : ''),
        area: normalizeArea(pickBy(row, HEADER_ALIAS['area']))
      });
    });
    return out;
  }
  // 以寝室号查对应班级列表（可能多个 → 混寝）；无匹配返回 []
  function findDormClasses(dormMap, room) {
    if (room == null) return [];
    var r = String(room).trim();
    var res = [];
    (dormMap || []).forEach(function (d) {
      if (String(d.room).trim() === r) res.push(d.class);
    });
    // 去重且保持顺序
    var seen = {};
    return res.filter(function (c) { if (seen[c]) return false; seen[c] = true; return true; });
  }
  // 以寝室号查正确班级（多条时取第一条，兼容旧逻辑）
  function findDormClass(dormMap, room) {
    var list = findDormClasses(dormMap, room);
    return list.length ? list[0] : null;
  }
  // 以寝室号+区域查班级：优先同区域记录；同名寝室号跨区域互不干扰。
  // 兼容旧数据：记录无 area（或 area 为空）时作为通用兜底（仅在无任何同区域记录时使用）。
  function findDormClassesInArea(dormMap, room, area) {
    if (room == null) return [];
    var r = String(room).trim();
    var areaMatch = [];
    var generic = [];
    (dormMap || []).forEach(function (d) {
      if (String(d.room).trim() !== r) return;
      if (area != null && d.area && String(d.area).trim() === String(area).trim()) {
        areaMatch.push(d.class);
      } else {
        generic.push(d.class);
      }
    });
    var pick = areaMatch.length ? areaMatch : generic;
    var seen = {};
    return pick.filter(function (c) { if (seen[c]) return false; seen[c] = true; return true; });
  }
  // 班级列表 → 展示文案：单个班级直接返回；多个班级标注“X班和Y班混寝”
  function dormClassDisplay(classes) {
    if (!classes || classes.length === 0) return '';
    if (classes.length === 1) return classes[0];
    return classes.join('和') + '混寝';
  }

  // ---- 量化分排序 ----
  // by: 'score' | 'class'；dir: 'asc' | 'desc'
  function sortByScore(list, dir, sm, months) {
    var d = dir === 'asc' ? 1 : -1;
    return (list || []).slice().sort(function (a, b) {
      var sa = (sm && months && months.length) ? computeQuantized(sm, a.id, months).score : a.score;
      var sb = (sm && months && months.length) ? computeQuantized(sm, b.id, months).score : b.score;
      if (sa !== sb) return (sa - sb) * d;
      // 同分按班级→姓名稳定排序
      var ga = gradeIndex(studentGrade(a.class)), gb = gradeIndex(studentGrade(b.class));
      if (ga !== gb) return ga - gb;
      var ca = studentClassNo(a.class) || 999, cb = studentClassNo(b.class) || 999;
      if (ca !== cb) return ca - cb;
      return String(a.name).localeCompare(String(b.name), 'zh');
    });
  }

  // 计算加/扣分后的分数
  function computeAfter(current, delta) {
    var c = (typeof current === 'number' && !isNaN(current)) ? current : 100;
    var d = Number(delta); if (isNaN(d)) d = 0;
    return c + d;
  }

  // ---- 违纪统计（与量化分完全独立）----
  function disciplineCountByStudent(logs) {
    var m = {};
    (logs || []).forEach(function (l) { m[l.studentId] = (m[l.studentId] || 0) + 1; });
    return m;
  }
  // 某学生所有违纪原因（去重，按记录顺序）
  function studentDisciplineReasons(logs, studentId) {
    var seen = {}; var arr = [];
    (logs || []).forEach(function (l) {
      if (l.studentId !== studentId) return;
      var r = l.reason || '';
      if (r && !seen[r]) { seen[r] = true; arr.push(r); }
    });
    return arr;
  }
  // 某班级所有违纪原因（去重，按记录顺序）
  function disciplineClassReasons(students, logs, cls) {
    var idToClass = {};
    (students || []).forEach(function (s) { idToClass[s.id] = s.class; });
    var seen = {}; var arr = [];
    (logs || []).forEach(function (l) {
      var c = idToClass[l.studentId] || '(未知班级)';
      if (c !== cls) return;
      var r = l.reason || '';
      if (r && !seen[r]) { seen[r] = true; arr.push(r); }
    });
    return arr;
  }
  // 按班级汇总违纪次数：[{class, count}]，按次数降序
  function disciplineClassSummary(students, logs) {
    var idToClass = {};
    (students || []).forEach(function (s) { idToClass[s.id] = s.class; });
    var m = {};
    (logs || []).forEach(function (l) {
      var cls = idToClass[l.studentId] || '(未知班级)';
      m[cls] = (m[cls] || 0) + 1;
    });
    return Object.keys(m).map(function (k) { return { class: k, count: m[k] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }
  // 指定月份按班级汇总违纪：[{class, count, persons, reasons}]，按班级顺序（高一1班、高一2班…）
  function disciplineClassSummaryMonth(students, logs, month) {
    var idToClass = {};
    (students || []).forEach(function (s) { idToClass[s.id] = s.class; });
    var m = {};
    (logs || []).forEach(function (l) {
      if (month && String(l.date).indexOf(month) !== 0) return; // 只统计该月份
      var cls = idToClass[l.studentId] || '(未知班级)';
      if (!m[cls]) m[cls] = { count: 0, persons: {}, reasons: {} };
      m[cls].count++;
      m[cls].persons[l.studentId] = true;
      var r = l.reason || '';
      if (r) m[cls].reasons[r] = true;
    });
    return Object.keys(m).map(function (k) {
      return { class: k, count: m[k].count, persons: Object.keys(m[k].persons).length, reasons: Object.keys(m[k].reasons) };
    }).sort(function (a, b) {
      var pa = parseClass(a.class), pb = parseClass(b.class);
      var ga = pa ? gradeIndex(pa.grade) : 99, gb = pb ? gradeIndex(pb.grade) : 99;
      if (ga !== gb) return ga - gb;
      return (pa ? pa.classNo : 999) - (pb ? pb.classNo : 999);
    });
  }

  // 指定日期范围按班级汇总违纪：[{class, count, persons, reasons}]，按班级顺序；from/to 为 YYYY-MM-DD，空串不限
  function disciplineClassSummaryRange(students, logs, from, to) {
    var idToClass = {};
    (students || []).forEach(function (s) { idToClass[s.id] = s.class; });
    var m = {};
    (logs || []).forEach(function (l) {
      var d = String(l.date);
      if (from && d < from) return;
      if (to && d > to) return;
      var cls = idToClass[l.studentId] || '(未知班级)';
      if (!m[cls]) m[cls] = { count: 0, persons: {}, reasons: {} };
      m[cls].count++;
      m[cls].persons[l.studentId] = true;
      var r = l.reason || '';
      if (r) m[cls].reasons[r] = true;
    });
    return Object.keys(m).map(function (k) {
      return { class: k, count: m[k].count, persons: Object.keys(m[k].persons).length, reasons: Object.keys(m[k].reasons) };
    }).sort(function (a, b) {
      var pa = parseClass(a.class), pb = parseClass(b.class);
      var ga = pa ? gradeIndex(pa.grade) : 99, gb = pb ? gradeIndex(pb.grade) : 99;
      if (ga !== gb) return ga - gb;
      return (pa ? pa.classNo : 999) - (pb ? pb.classNo : 999);
    });
  }
  // ================= 请假名单整理器 =================
  var CLASS_TOKEN_RE = /高[一二三][0-9一二三四五六七八九十]+班/g;

  function splitNames(seg) {
    return String(seg).split(/[\s、，,和]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  // 把“寝室号+姓名”混排的一段拆成 [{room, names:[]}]
  function parseRoomsSegment(seg) {
    var res = [];
    var re = /(\d{2,4})/g;
    var idx = [];
    var m;
    while ((m = re.exec(seg))) { idx.push({ room: m[1], start: m.index, end: m.index + m[0].length }); }
    for (var i = 0; i < idx.length; i++) {
      var namePart = seg.slice(idx[i].end, (i + 1 < idx.length) ? idx[i + 1].start : seg.length);
      res.push({ room: idx[i].room, names: splitNames(namePart) });
    }
    return res;
  }

  // 解析请假原文 → { grades: {grade:{classNo:{rooms:{room:[names]}, order:[]}}}, unresolved:[] }
  function parseLeaveText(raw) {
    var grades = {};
    var unresolved = [];
    var lines = String(raw || '').split(/\r?\n/);
    lines.forEach(function (line) {
      var text = line.trim();
      if (!text) return;
      var tokens = [];
      var mm; CLASS_TOKEN_RE.lastIndex = 0;
      while ((mm = CLASS_TOKEN_RE.exec(text))) { tokens.push({ tok: mm[0], start: mm.index, end: mm.index + mm[0].length }); }
      if (tokens.length === 0) {
        // 含“寝室号+姓名”但没识别到班级 → 无法归类，交人工
        if (/\d{2,4}[\u4e00-\u9fa5]/.test(text)) unresolved.push(text);
        return;
      }
      for (var i = 0; i < tokens.length; i++) {
        var pc = parseClass(tokens[i].tok);
        if (!pc) continue;
        var segEnd = (i + 1 < tokens.length) ? tokens[i + 1].start : text.length;
        var rooms = parseRoomsSegment(text.slice(tokens[i].end, segEnd));
        if (rooms.length === 0) continue;
        if (!grades[pc.grade]) grades[pc.grade] = {};
        var g = grades[pc.grade];
        if (!g[pc.classNo]) g[pc.classNo] = { rooms: {}, order: [] };
        var cls = g[pc.classNo];
        rooms.forEach(function (r) {
          if (!cls.rooms[r.room]) { cls.rooms[r.room] = []; cls.order.push(r.room); }
          r.names.forEach(function (n) { if (cls.rooms[r.room].indexOf(n) === -1) cls.rooms[r.room].push(n); });
        });
      }
    });
    return { grades: grades, unresolved: unresolved };
  }

  // 整理成固定格式；返回 { text, unresolved, removedWalkers, mismatched }
  // 可选第二参数 students：当提供时，请假名单中出现的“走读生”姓名会被直接去掉，并标注提醒
  function formatLeave(raw, students) {
    var parsed = parseLeaveText(raw);
    var walkers = {};
    var nameSet = {};       // 所有学生姓名集合（用于判断同名不同班）
    var classNames = {};    // 班级+姓名 → true（用于精确匹配）
    var hasStudents = Array.isArray(students);
    if (hasStudents) {
      students.forEach(function (s) {
        if (!s || !s.name) return;
        nameSet[s.name] = true;
        if (s.class) classNames[s.class + '|' + s.name] = true;
        if (s.boarding === '走读') walkers[s.name] = true;
      });
    }
    var removedWalkers = [];
    var mismatched = []; // 班级姓名与学生信息不对照（同名不同班不算）
    var out = [];
    GRADES.forEach(function (grade) {
      var block = [grade + '请假名单'];
      var g = parsed.grades[grade];
      var classNos = g ? Object.keys(g).map(Number).sort(function (a, b) { return a - b; }) : [];
      if (classNos.length === 0) {
        block.push('（本次无' + grade + '请假数据）');
      } else {
        classNos.forEach(function (cn, idx) {
          if (idx > 0) block.push('');
          block.push(grade + cn + '班');
          var cls = g[cn];
          var classLabel = grade + cn + '班'; // 如 高一1班
          var rooms = cls.order.slice().sort(function (a, b) { return Number(a) - Number(b); });
          rooms.forEach(function (room) {
            // 去掉走读生姓名（仅当提供学生库时）
            var names = cls.rooms[room];
            if (hasStudents) {
              names = names.filter(function (n) {
                if (walkers[n]) { removedWalkers.push(n); return false; }
                return true;
              });
            }
            // 检测班级姓名不对照
            if (hasStudents) {
              names.forEach(function (n) {
                var key = classLabel + '|' + n;
                if (!classNames[key] && !nameSet[n]) {
                  // 学生库中既没有这个班级+姓名，也没有这个姓名（同名不同班不算）
                  if (mismatched.indexOf(classLabel + ' ' + n) === -1) mismatched.push(classLabel + ' ' + n);
                }
              });
            }
            if (names.length) block.push('·' + room + ' ' + names.join(' '));
          });
        });
      }
      block.push('');
      block.push('请各班主任仔细核对，有问题及时沟通！！！');
      out.push(block.join('\n'));
    });
    // 去重提醒（同一姓名可能出现在多个房间）
    removedWalkers = removedWalkers.filter(function (v, i) { return removedWalkers.indexOf(v) === i; });
    return { text: out.join('\n\n'), unresolved: parsed.unresolved, removedWalkers: removedWalkers, mismatched: mismatched };
  }

  // ================= 每日查寝通报整理器 =================
  var AREAS = ['女寝', '男寝', '科技楼'];

  // 描述归类（关键词 → 标准表述），返回标准表述数组（按固定顺序）
  function classifyReportDesc(desc) {
    var d = String(desc || '');
    var cats = [];
    var isPlace = /摆放不整齐|摆放乱|未摆放整齐|没摆放|摆放不齐|摆放/.test(d);
    var isHang = /乱挂|挂有|床上有东西|胡乱放|乱放|毛巾/.test(d);
    var isClean = /垃圾|杂物|脏|不干净|没打扫|未打扫|打扫不干净/.test(d);
    var isDiscipline = /说话|喧哗|讲话|大声|吵闹|吵|喧闹|打闹|纪律/.test(d);
    if (isPlace) cats.push('物品摆放不整齐');
    if (isHang) cats.push('物品乱挂');
    if (isClean) cats.push('卫生未打扫干净');
    if (isDiscipline) {
      var t = d.match(/(\d{1,2})[:：](\d{2})/);
      cats.push('熄灯后 多次提醒 仍大声喧哗影响他人休息' + (t ? ('（' + t[1] + ':' + t[2] + '）') : ''));
    }
    return cats;
  }

  // 拆“3位寝室号+描述”段 → [{room, desc}]（3 位数避免把时间 23:10 误当寝室号）
  function parseRoomsDesc(seg) {
    var res = [];
    var re = /(\d{3})/g;
    var idx = [];
    var m;
    while ((m = re.exec(seg))) { idx.push({ room: m[1], start: m.index, end: m.index + m[0].length }); }
    for (var i = 0; i < idx.length; i++) {
      var desc = seg.slice(idx[i].end, (i + 1 < idx.length) ? idx[i + 1].start : seg.length);
      res.push({ room: idx[i].room, desc: desc.replace(/^[\s，,、。：:]+|[\s，,、。：:]+$/g, '') });
    }
    return res;
  }

  function parseReportText(raw) {
    var praise = [];
    var report = [];
    var unresolved = [];
    var lines = String(raw || '').split(/\r?\n/);
    var area = '女寝';
    var cat = '表扬';
    lines.forEach(function (line) {
      var text = line.trim();
      if (!text) return;
      // 更新区域
      if (text.indexOf('科技楼') !== -1) area = '科技楼';
      else if (text.indexOf('男寝') !== -1) area = '男寝';
      else if (text.indexOf('女寝') !== -1) area = '女寝';
      // 更新类别
      if (text.indexOf('表扬') !== -1) cat = '表扬';
      if (text.indexOf('通报') !== -1) cat = '通报';
      // 数据行？
      var tokens = []; var mm; CLASS_TOKEN_RE.lastIndex = 0;
      while ((mm = CLASS_TOKEN_RE.exec(text))) { tokens.push({ tok: mm[0], start: mm.index, end: mm.index + mm[0].length }); }
      if (tokens.length === 0) return; // 纯表头/区域行
      for (var i = 0; i < tokens.length; i++) {
        var pc = parseClass(tokens[i].tok);
        if (!pc) continue;
        var segEnd = (i + 1 < tokens.length) ? tokens[i + 1].start : text.length;
        var seg = text.slice(tokens[i].end, segEnd);
        var rooms = parseRoomsDesc(seg);
        if (rooms.length === 0) continue;
        rooms.forEach(function (r) {
          var base = { area: area, classLabel: pc.label, grade: pc.grade, classNo: pc.classNo, room: r.room };
          if (cat === '表扬') {
            praise.push(base);
          } else {
            var cats = classifyReportDesc(r.desc);
            var e = Object.assign({}, base, { cats: cats, rawDesc: r.desc });
            report.push(e);
            if (cats.length === 0 && r.desc) unresolved.push(normClassLabel(pc.label) + ' ' + r.room + '：' + r.desc);
          }
        });
      }
    });
    return { praise: praise, report: report, unresolved: unresolved };
  }

  // 班级标签归一化：去括号/空白，中文数字转阿拉伯（"高一（8）班" → "高一8班"），用于班级对照比较
  function normClassLabel(label) {
    if (!label) return '';
    var s = String(label).replace(/[（()）\s]/g, '');
    var m = s.match(/^(高[一二三])([0-9一二三四五六七八九十]+)班$/);
    if (!m) return s;
    var n = cnToNum(m[2]);
    if (n == null) return s;
    return m[1] + n + '班';
  }

  function verifyClass(entry, dormMap, issues) {
    if (!dormMap || !dormMap.length) return entry.classLabel;
    // 按通报区域核对：同名寝室号在男寝/女寝/科技楼各自独立，不合并为混寝
    var classes = findDormClassesInArea(dormMap, entry.room, entry.area);
    if (classes.length === 0) return entry.classLabel;
    var normEntry = normClassLabel(entry.classLabel);
    var normClasses = classes.map(normClassLabel);
    // 混寝：同一寝室号对应多个班级
    if (classes.length > 1) {
      // 原始班级在对照表内（归一化后） → 不更正，仅提示该寝室为混寝
      if (normClasses.indexOf(normEntry) !== -1) {
        return entry.classLabel;
      }
      var disp = dormClassDisplay(classes);
      issues.push('原始『' + entry.classLabel + ' ' + entry.room + '』与对照表不符，' + entry.room + ' 实际为 ' + disp + '，已自动更正为 ' + disp);
      return disp;
    }
    // 单个班级
    var correct = classes[0];
    if (normClassLabel(correct) !== normEntry) {
      issues.push('原始『' + entry.classLabel + ' ' + entry.room + '』与对照表不符，' + entry.room + ' 实际属 ' + correct + '，已自动更正为 ' + correct);
      return correct;
    }
    return entry.classLabel;
  }

  // 日期标签：几月几号（如 8月11日），不显示年份与时间
  function monthDayLabel(d) {
    d = d || new Date();
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function formatReport(raw, dormMap, dateLabel) {
    var parsed = parseReportText(raw);
    var mismatchIssues = [];
    var titleLabel = (typeof dateLabel === 'string' && dateLabel) ? dateLabel : monthDayLabel();

    // 核对（以寝室号为准）并回填正确班级；班级标签统一归一化为无括号格式（高一（8）班 → 高一8班）
    function fix(entry) {
      var label = verifyClass(entry, dormMap, mismatchIssues);
      var norm = normClassLabel(label);
      entry.classLabel = norm;
      var pc = parseClass(norm);
      if (pc) { entry.grade = pc.grade; entry.classNo = pc.classNo; }
      return entry;
    }
    parsed.praise.forEach(fix);
    parsed.report.forEach(fix);

    function cmp(a, b) {
      if (a.area !== b.area) return AREAS.indexOf(a.area) - AREAS.indexOf(b.area);
      var ga = gradeIndex(a.grade), gb = gradeIndex(b.grade);
      if (ga !== gb) return ga - gb;
      if (a.classNo !== b.classNo) return a.classNo - b.classNo;
      return Number(a.room) - Number(b.room);
    }

    var lines = [titleLabel + '查寝通报', ''];

    // 表扬
    lines.push('表现好的班级宿舍有：');
    var anyPraise = false;
    AREAS.forEach(function (ar) {
      lines.push(ar);
      var inArea = parsed.praise.filter(function (e) { return e.area === ar; });
      if (inArea.length === 0) { lines.push('（本区域本次无表扬宿舍）'); return; }
      anyPraise = true;
      // 按寝室号聚合班级：单班级寝室按班级合并多寝室；多班级寝室（混寝）合并为“X班和Y班”
      var roomMap = {};
      inArea.forEach(function (e) {
        if (!roomMap[e.room]) roomMap[e.room] = [];
        roomMap[e.room].push(e);
      });
      var classRooms = {};
      var order = [];
      var mixRows = [];
      Object.keys(roomMap).forEach(function (room) {
        var es = roomMap[room];
        var labels = [];
        es.forEach(function (e) { if (labels.indexOf(e.classLabel) === -1) labels.push(e.classLabel); });
        if (labels.length > 1) {
          labels.sort(function (a, b) {
            var pa = parseClass(a), pb = parseClass(b);
            var ga = pa ? gradeIndex(pa.grade) : 99, gb = pb ? gradeIndex(pb.grade) : 99;
            if (ga !== gb) return ga - gb;
            return (pa ? pa.classNo : 999) - (pb ? pb.classNo : 999);
          });
          mixRows.push({ labels: labels, room: room });
        } else {
          var label = labels[0];
          if (!classRooms[label]) { classRooms[label] = []; order.push(label); }
          classRooms[label].push(room);
        }
      });
      // 混寝行文案：同年级时第二班省略年级（高二5班、10班 混寝）
      function mixLabel(labels) {
        var first = labels[0], rest = labels.slice(1);
        var p0 = parseClass(first);
        var tail = rest.map(function (l) {
          var p = parseClass(l);
          if (p && p0 && p.grade === p0.grade) return p.classNo + '班';
          return l;
        });
        return first + '、' + tail.join('、');
      }
      var linesOut = [];
      order.map(function (k) { return { label: k, rooms: classRooms[k] }; }).sort(function (a, b) {
        var pa = parseClass(a.label), pb = parseClass(b.label);
        var ga = pa ? gradeIndex(pa.grade) : 99, gb = pb ? gradeIndex(pb.grade) : 99;
        if (ga !== gb) return ga - gb;
        return (pa ? pa.classNo : 999) - (pb ? pb.classNo : 999);
      }).forEach(function (g) {
        var rooms = g.rooms.slice().sort(function (a, b) { return Number(a) - Number(b); });
        linesOut.push({ key: g.label, label: g.label + ' ' + rooms.join('、') });
      });
      mixRows.forEach(function (m) {
        var p0 = parseClass(m.labels[0]);
        linesOut.push({ key: m.labels[0] + '+' + m.labels.join('+'), label: mixLabel(m.labels) + ' 混寝 ' + m.room });
      });
      linesOut.sort(function (a, b) {
        var pa = parseClass(a.key), pb = parseClass(b.key);
        var ga = pa ? gradeIndex(pa.grade) : 99, gb = pb ? gradeIndex(pb.grade) : 99;
        if (ga !== gb) return ga - gb;
        return (pa ? pa.classNo : 999) - (pb ? pb.classNo : 999);
      });
      linesOut.forEach(function (r) { lines.push(r.label); });
    });
    if (anyPraise) lines.push('就寝秩序好 卫生干净整洁');

    lines.push('');
    // 通报
    lines.push('通报：');
    AREAS.forEach(function (ar) {
      lines.push(ar);
      var inArea = parsed.report.filter(function (e) { return e.area === ar; }).sort(cmp);
      if (inArea.length === 0) { lines.push('（本区域本次无通报）'); return; }
      inArea.forEach(function (e) {
        var desc = e.cats.length ? e.cats.join('，') : e.rawDesc;
        lines.push(e.classLabel + ' ' + e.room + '宿舍 ' + desc);
      });
    });

    var issues = mismatchIssues.concat(parsed.unresolved.length ? ['未能自动归类（请人工确认）：'].concat(parsed.unresolved) : []);
    return { text: lines.join('\n'), issues: issues, mismatchIssues: mismatchIssues, unresolved: parsed.unresolved };
  }

  // ================= 首页摘要 =================
  function computeHomeSummary(state, today) {
    state = state || {};
    today = today || todayStr();
    var students = state.students || [];
    var scoreLogs = state.scoreLogs || [];
    var disciplineLogs = state.disciplineLogs || [];
    var leaveRecords = state.leaveRecords || [];
    var dormReports = state.dormReports || [];

    var addSum = 0, subSum = 0, cnt = 0;
    scoreLogs.forEach(function (l) {
      if (l.date !== today) return;
      cnt++;
      // 按类别区分：班奖/政奖计入加分，班扣/政扣计入扣分（扣分为负数）
      // 兼容旧记录（无cat字段时按delta正负区分）
      if (l.cat === 'banJiang' || l.cat === 'zhengJiang') {
        addSum += Math.abs(Number(l.delta) || 0);
      } else if (l.cat === 'banKou' || l.cat === 'zhengKou') {
        subSum -= Math.abs(Number(l.delta) || 0);
      } else {
        if (l.delta >= 0) addSum += l.delta; else subSum += l.delta;
      }
    });

    var todayDiscipline = disciplineLogs.filter(function (l) { return l.date === today; }).length;

    var leaveCount = 0, leaveDate = null;
    if (leaveRecords.length) {
      var latest = leaveRecords.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); })[0];
      leaveCount = latest.count || 0; leaveDate = latest.date;
    }

    var sm = state.scoreMonthly || [];
    var months = activeScoreMonths(state.settings);
    var warnings = [];
    students.forEach(function (s) {
      var q = months.length ? computeQuantized(sm, s.id, months) : { score: s.score };
      if (typeof q.score === 'number' && q.score < 60) {
        warnings.push({ id: s.id, class: s.class, name: s.name, score: q.score });
      }
    });
    warnings.sort(function (a, b) { return a.score - b.score; });

    // 各年级人数（高一/高二/高三）+ 男女生数量
    var gradeCount = { '高一': 0, '高二': 0, '高三': 0 };
    var gradeGender = { '高一': { male: 0, female: 0 }, '高二': { male: 0, female: 0 }, '高三': { male: 0, female: 0 } };
    var totalMale = 0, totalFemale = 0, boardingCount = 0;
    students.forEach(function (s) {
      var g = studentGrade(s.class);
      if (gradeCount[g] != null) gradeCount[g] += 1;
      if (gradeGender[g]) {
        if (s.gender === '男') gradeGender[g].male += 1;
        else if (s.gender === '女') gradeGender[g].female += 1;
      }
      if (s.gender === '男') totalMale += 1;
      else if (s.gender === '女') totalFemale += 1;
      if (s.boarding !== '走读') boardingCount += 1; // 住校人数（默认住校，仅"走读"不计）
    });

    // 请假折线数据：按日期汇总每日请假总数（升序），供首页折线图使用
    var leaveTrend = [];
    var leaveByDate = {};
    leaveRecords.forEach(function (r) {
      var d = String(r.date);
      var c = Number(r.count) || 0;
      leaveByDate[d] = (leaveByDate[d] || 0) + c;
    });
    Object.keys(leaveByDate).sort(function (a, b) { return String(a).localeCompare(String(b)); })
      .forEach(function (d) { leaveTrend.push({ date: d, count: leaveByDate[d] }); });
    leaveTrend = leaveTrend.slice(-14); // 只保留最近 14 天，折线图不至于过宽

    var recent = [];
    leaveRecords.forEach(function (r) { recent.push({ type: '请假名单', module: 'leave', date: r.date, id: r.id }); });
    dormReports.forEach(function (r) { recent.push({ type: '查寝通报', module: 'report', date: r.date, id: r.id }); });
    recent.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    recent = recent.slice(0, 8);

    return {
      studentCount: students.length,
      gradeCount: gradeCount,
      gradeGender: gradeGender,
      totalMale: totalMale, totalFemale: totalFemale, boardingCount: boardingCount,
      todayScore: { add: addSum, sub: subSum, count: cnt },
      todayDiscipline: todayDiscipline,
      leaveCount: leaveCount, leaveDate: leaveDate,
      leaveTrend: leaveTrend,
      warnings: warnings,
      recent: recent
    };
  }

  // ================= 量化管理分（五个月八列） =================

  // 取最近 N 个月（含当月），返回 ['YYYY-MM', ...] 升序
  function recentMonths(n, from) {
    var d = from || new Date();
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      out.push(dt.getFullYear() + '-' + pad2(dt.getMonth() + 1));
    }
    return out;
  }

  // 生效的统计月份窗口：用户手动自定义的月份优先（含显式清空 []）；未自定义（null）时回退到最近 5 个月
  function activeScoreMonths(settings, n, from) {
    var sm = settings && settings.scoreMonths;
    if (Array.isArray(sm)) return sm.slice();   // 用户已自定义（可能是空数组）
    return recentMonths(n || 5, from);
  }

  // 取某学生某月数据（无则返回全 0 占位）
  function monthScore(scoreMonthly, studentId, month) {
    var m = (scoreMonthly || []).filter(function (x) { return x.studentId === studentId && x.month === month; })[0];
    return m || { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
  }

  // 计算某学生在指定月份集合内的量化分：100 - 班扣 + 班奖 - 政扣 + 政奖
  // 违纪扣分按次数独立计算并写入当月政扣（每次 -20），量化分从政扣中体现
  function computeQuantized(scoreMonthly, studentId, months) {
    var sum = { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
    (months || []).forEach(function (m) {
      var ms = monthScore(scoreMonthly, studentId, m);
      sum.banKou += ms.banKou || 0;
      sum.banJiang += ms.banJiang || 0;
      sum.zhengKou += ms.zhengKou || 0;
      sum.zhengJiang += ms.zhengJiang || 0;
    });
    return {
      banKou: sum.banKou, banJiang: sum.banJiang, zhengKou: sum.zhengKou, zhengJiang: sum.zhengJiang,
      score: 100 - sum.banKou + sum.banJiang - sum.zhengKou + sum.zhengJiang
    };
  }

  // 生成/更新某学生某月的四类记录（scoreMonthly 增删改）
  // mode: 'add' 累加（记流水用）；'set' 直接设值（单元格编辑用），默认 'set'
  function setMonthScore(scoreMonthly, studentId, month, data, mode) {
    var isAdd = mode === 'add';
    var m = (scoreMonthly || []).filter(function (x) { return x.studentId === studentId && x.month === month; })[0];
    if (m) {
      ['banKou', 'banJiang', 'zhengKou', 'zhengJiang'].forEach(function (k) {
        if (data[k] != null) {
          m[k] = isAdd ? ((Number(m[k]) || 0) + (Number(data[k]) || 0)) : (Number(data[k]) || 0);
        }
      });
      return m;
    }
    var rec = { id: uid('m'), studentId: studentId, month: month, banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
    ['banKou', 'banJiang', 'zhengKou', 'zhengJiang'].forEach(function (k) {
      if (data[k] != null) rec[k] = Number(data[k]) || 0;
    });
    scoreMonthly.push(rec);
    return rec;
  }

  // 某学生所有月份量化分累计汇总（班扣/班奖/政扣/政奖 累加 + 总分）
  function studentScoreTotals(scoreMonthly, studentId) {
    var sum = { banKou: 0, banJiang: 0, zhengKou: 0, zhengJiang: 0 };
    (scoreMonthly || []).forEach(function (x) {
      if (!x || x.studentId !== studentId) return;
      sum.banKou += Number(x.banKou) || 0;
      sum.banJiang += Number(x.banJiang) || 0;
      sum.zhengKou += Number(x.zhengKou) || 0;
      sum.zhengJiang += Number(x.zhengJiang) || 0;
    });
    return {
      banKou: sum.banKou, banJiang: sum.banJiang, zhengKou: sum.zhengKou, zhengJiang: sum.zhengJiang,
      score: 100 - sum.banKou + sum.banJiang - sum.zhengKou + sum.zhengJiang
    };
  }

  return {
    NAV_ITEMS: NAV_ITEMS,
    GRADES: GRADES,
    charInitial: charInitial,
    nameInitials: nameInitials,
    charFullPinyin: charFullPinyin,
    nameFullPinyin: nameFullPinyin,
    pinyinMatch: pinyinMatch,
    todayStr: todayStr,
    uid: uid,
    parseClass: parseClass,
    gradeIndex: gradeIndex,
    parseCSV: parseCSV,
    buildStudents: buildStudents,
    scoreClass: scoreClass,
    studentGrade: studentGrade,
    studentClassNo: studentClassNo,
    formatName: formatName,
    filterStudents: filterStudents,
    sortStudentsByClass: sortStudentsByClass,
    buildDormMapFromRows: buildDormMapFromRows,
    DORM_AREAS: DORM_AREAS,
    DORM_ROOMS: DORM_ROOMS,
    dormCapacity: dormCapacity,
    sortByScore: sortByScore,
    computeAfter: computeAfter,
    disciplineCountByStudent: disciplineCountByStudent,
    studentDisciplineReasons: studentDisciplineReasons,
    disciplineClassReasons: disciplineClassReasons,
    disciplineClassSummary: disciplineClassSummary,
    disciplineClassSummaryMonth: disciplineClassSummaryMonth,
    disciplineClassSummaryRange: disciplineClassSummaryRange,
    formatLeave: formatLeave,
    formatReport: formatReport,
    computeHomeSummary: computeHomeSummary,
    activeScoreMonths: activeScoreMonths,
    monthScore: monthScore,
    computeQuantized: computeQuantized,
    setMonthScore: setMonthScore,
    studentScoreTotals: studentScoreTotals
  };
});
  // ---- 全拼支持（GB2312 一级汉字 + 常见字，按 Unicode 码点索引二分查找）----
  var PY_CODES = [0,1,3,7,8,9,10,11,13,14,17,19,20,22,24,25,26,27,28,29,34,36,37,39,42,43,45,48,50,52,56,57,58,59,61,62,67,69,72,73,75,76,77,78,79,80,82,83,84,86,88,89,93,94,95,96,97,102,112,113,115,126,134,136,137,139,140,142,143,145,146,148,149,154,155,161,162,164,165,166,167,168,169,171,172,173,174,178,186,191,192,193,197,198,199,202,203,205,206,209,211,212,213,214,215,216,217,223,227,228,229,234,236,240,242,246,247,251,253,255,257,266,269,270,271,272,273,279,280,281,282,286,287,288,292,294,298,303,304,308,310,312,314,316,323,326,333,334,335,336,337,339,341,345,347,348,352,355,361,364,367,368,371,383,388,392,395,397,407,411,413,416,419,421,422,423,424,425,430,431,437,447,451,452,458,463,464,471,472,477,478,481,489,493,494,495,497,506,525,530,532,536,537,538,543,545,550,554,570,572,574,583,591,602,604,613,630,631,639,640,645,648,653,675,680,684,690,699,719,730,743,755,757,763,786,801,831,833,835,836,837,838,840,841,843,845,849,852,858,860,866,869,872,875,876,877,880,881,883,884,885,886,887,888,889,891,892,893,896,901,904,905,908,909,914,917,919,921,923,924,928,932,940,943,944,946,947,949,950,951,955,960,964,966,969,971,972,975,977,987,989,992,993,996,1005,1007,1008,1011,1014,1016,1017,1018,1019,1021,1023,1024,1025,1027,1030,1031,1034,1041,1042,1047,1048,1049,1050,1051,1053,1056,1060,1064,1065,1067,1070,1072,1078,1079,1080,1081,1082,1083,1085,1089,1090,1091,1098,1101,1104,1105,1108,1110,1125,1127,1129,1130,1135,1138,1151,1160,1179,1181,1182,1183,1184,1185,1187,1192,1193,1194,1195,1201,1202,1203,1215,1219,1223,1225,1227,1234,1240,1247,1252,1274,1278,1279,1280,1285,1286,1288,1302,1303,1305,1309,1312,1313,1315,1322,1337,1338,1339,1343,1345,1347,1351,1352,1353,1354,1358,1359,1361,1362,1363,1365,1366,1367,1370,1372,1374,1376,1377,1378,1380,1383,1387,1391,1392,1393,1395,1396,1397,1399,1400,1407,1410,1412,1413,1414,1417,1419,1420,1429,1432,1434,1439,1442,1446,1448,1449,1467,1471,1473,1474,1480,1481,1482,1483,1484,1485,1489,1492,1494,1495,1496,1497,1499,1504,1507,1508,1509,1510,1514,1515,1516,1517,1518,1519,1520,1522,1523,1526,1527,1528,1529,1532,1537,1539,1540,1544,1545,1546,1548,1549,1550,1551,1552,1553,1555,1557,1559,1563,1565,1566,1567,1568,1574,1575,1576,1577,1579,1580,1581,1582,1583,1585,1588,1589,1592,1593,1595,1596,1598,1600,1606,1608,1610,1616,1621,1624,1627,1628,1634,1640,1651,1653,1656,1659,1660,1661,1664,1670,1675,1676,1678,1679,1680,1682,1685,1686,1689,1704,1708,1711,1713,1715,1720,1725,1728,1729,1732,1734,1735,1736,1737,1741,1742,1745,1751,1759,1765,1766,1768,1769,1770,1773,1774,1778,1786,1788,1793,1798,1799,1801,1808,1828,1836,1838,1839,1841,1854,1859,1860,1862,1866,1889,1892,1893,1894,1898,1902,1912,1916,1920,1922,1924,1927,1929,1930,1944,1948,1949,1959,1971,1975,1979,1989,2003,2012,2017,2019,2045,2057,2062,2072,2075,2097,2098,2100,2102,2107,2111,2126,2152,2154,2156,2166,2190,2191,2211,2231,2236,2250,2266,2267,2270,2272,2274,2276,2285,2288,2289,2292,2298,2301,2302,2307,2310,2312,2335,2339,2344,2349,2352,2362,2366,2368,2375,2378,2381,2382,2383,2384,2385,2391,2394,2395,2397,2398,2399,2400,2401,2404,2406,2410,2415,2423,2434,2435,2436,2443,2450,2459,2466,2467,2470,2475,2478,2498,2499,2507,2510,2516,2527,2528,2553,2554,2562,2566,2577,2581,2593,2596,2602,2608,2613,2636,2641,2644,2648,2654,2667,2691,2693,2706,2707,2713,2718,2719,2728,2729,2753,2773,2788,2795,2796,2798,2800,2803,2806,2809,2820,2823,2829,2831,2837,2838,2842,2844,2847,2855,2857,2858,2859,2862,2863,2865,2868,2871,2872,2873,2874,2884,2887,2888,2889,2891,2894,2895,2897,2900,2902,2903,2912,2914,2917,2931,2932,2934,2936,2937,2941,2946,2948,2950,2951,2952,2954,2962,2963,2966,2969,2981,2984,2990,3001,3003,3014,3019,3024,3025,3027,3028,3034,3036,3045,3048,3052,3067,3071,3073,3075,3076,3079,3096,3100,3103,3104,3109,3113,3121,3126,3142,3145,3162,3178,3188,3190,3199,3218,3226,3251,3265,3266,3273,3276,3297,3305,3408,3412,3413,3415,3416,3417,3420,3421,3423,3427,3428,3430,3433,3434,3440,3445,3450,3453,3457,3459,3461,3463,3464,3465,3467,3468,3471,3479,3480,3481,3482,3483,3484,3485,3486,3488,3489,3490,3491,3492,3494,3498,3499,3504,3507,3508,3509,3510,3513,3517,3518,3519,3522,3524,3525,3526,3527,3532,3536,3538,3539,3549,3550,3551,3553,3557,3560,3576,3577,3578,3579,3580,3583,3585,3588,3590,3593,3594,3599,3601,3604,3606,3608,3610,3613,3620,3623,3633,3640,3641,3642,3644,3645,3646,3647,3648,3649,3650,3653,3656,3657,3658,3659,3662,3663,3665,3669,3678,3680,3681,3685,3695,3697,3705,3711,3713,3714,3732,3735,3739,3753,3757,3763,3768,3775,3801,3809,3814,3816,3818,3821,3824,3835,3847,3854,3860,3862,3881,3885,3916,4045,4061,4062,4065,4066,4069,4070,4071,4072,4073,4075,4078,4081,4082,4083,4084,4087,4094,4097,4098,4099,4101,4102,4104,4108,4112,4117,4118,4120,4122,4123,4124,4125,4134,4135,4141,4142,4152,4157,4162,4165,4172,4181,4194,4210,4211,4212,4214,4216,4219,4220,4221,4223,4228,4230,4231,4234,4239,4240,4243,4244,4245,4247,4249,4250,4252,4254,4255,4262,4263,4269,4278,4279,4280,4297,4298,4307,4310,4342,4343,4346,4352,4354,4355,4356,4362,4367,4371,4373,4375,4376,4379,4383,4384,4389,4390,4391,4399,4401,4409,4410,4434,4435,4437,4445,4450,4452,4454,4457,4458,4460,4461,4464,4465,4473,4475,4476,4480,4481,4484,4485,4488,4490,4491,4496,4498,4503,4504,4513,4522,4526,4535,4541,4547,4549,4550,4556,4557,4567,4568,4569,4576,4583,4587,4593,4597,4603,4605,4607,4608,4609,4610,4622,4626,4628,4629,4630,4636,4637,4640,4645,4647,4648,4650,4655,4667,4675,4683,4685,4688,4690,4693,4706,4708,4712,4713,4715,4716,4717,4719,4720,4723,4726,4732,4735,4740,4745,4749,4756,4767,4768,4771,4774,4776,4780,4783,4786,4792,4796,4805,4810,4811,4817,4821,4828,4831,4832,4838,4839,4840,4841,4843,4845,4846,4847,4848,4851,4854,4857,4858,4865,4872,4873,4879,4890,4895,4900,4903,4927,4936,4940,4942,4945,4949,4962,4967,4968,4976,4983,5003,5006,5032,5054,5058,5064,5066,5074,5094,5128,5130,5132,5133,5134,5135,5136,5137,5138,5142,5144,5146,5162,5166,5171,5172,5175,5183,5184,5185,5191,5195,5197,5198,5201,5202,5203,5204,5208,5211,5219,5222,5223,5225,5227,5228,5229,5230,5231,5232,5235,5238,5241,5244,5246,5247,5248,5252,5257,5258,5265,5266,5267,5269,5270,5271,5272,5274,5275,5280,5281,5282,5284,5285,5288,5291,5292,5297,5301,5305,5308,5309,5311,5314,5316,5317,5318,5319,5320,5321,5324,5325,5326,5328,5330,5331,5332,5334,5336,5337,5339,5340,5343,5346,5347,5349,5350,5351,5352,5353,5356,5357,5359,5361,5363,5364,5367,5372,5373,5374,5375,5377,5378,5383,5385,5390,5393,5398,5402,5403,5405,5406,5407,5408,5409,5411,5412,5413,5416,5418,5419,5423,5434,5437,5442,5445,5446,5449,5452,5453,5454,5455,5456,5461,5470,5471,5473,5474,5475,5479,5486,5494,5495,5499,5504,5506,5511,5512,5513,5516,5519,5520,5522,5526,5528,5536,5538,5539,5541,5543,5544,5545,5546,5555,5559,5560,5562,5577,5581,5583,5584,5586,5590,5601,5603,5609,5610,5613,5620,5629,5632,5633,5634,5637,5647,5648,5651,5652,5660,5662,5674,5676,5677,5690,5693,5700,5702,5703,5704,5706,5716,5720,5735,5737,5752,5753,5762,5765,5767,5777,5778,5781,5790,5796,5801,5804,5805,5806,5808,5813,5820,5826,5829,5837,5838,5842,5854,5862,5888,5906,5912,5931,5935,5942,5945,5947,5950,5951,5957,5960,5964,5967,5969,5974,5977,5979,5981,5982,5986,5987,5990,5996,6000,6002,6004,6007,6023,6027,6028,6033,6039,6041,6044,6047,6049,6052,6053,6055,6057,6061,6063,6064,6073,6077,6081,6085,6091,6095,6103,6112,6114,6117,6118,6119,6120,6121,6124,6125,6129,6134,6135,6138,6146,6150,6156,6158,6159,6163,6164,6175,6176,6181,6183,6184,6189,6191,6204,6206,6211,6219,6220,6226,6227,6229,6234,6244,6246,6248,6254,6255,6256,6260,6262,6266,6270,6274,6279,6289,6294,6295,6318,6324,6361,6365,6384,6386,6387,6388,6393,6396,6398,6399,6400,6408,6409,6411,6413,6420,6423,6427,6429,6431,6440,6442,6443,6444,6445,6447,6449,6452,6453,6458,6461,6464,6466,6467,6470,6473,6478,6479,6480,6481,6486,6492,6495,6496,6497,6501,6504,6509,6511,6512,6526,6527,6529,6532,6537,6544,6549,6551,6554,6556,6557,6562,6563,6570,6571,6575,6582,6583,6596,6607,6608,6609,6610,6611,6612,6620,6622,6624,6629,6636,6639,6641,6643,6644,6655,6661,6663,6664,6667,6671,6673,6675,6678,6679,6689,6698,6711,6712,6713,6716,6717,6722,6723,6725,6726,6728,6732,6736,6737,6739,6740,6755,6757,6760,6761,6774,6785,6789,6790,6807,6818,6822,6823,6824,6829,6831,6832,6835,6848,6857,6859,6861,6866,6869,6872,6874,6880,6894,6897,6901,6906,6917,6925,6926,6930,6957,6960,6973,6975,6996,7002,7006,7031,7036,7042,7046,7060,7068,7080,7092,7095,7120,7131,7165,7178,7199,7201,7210,7217,7239,7257,7265,7281,7296,7300,7340,7456,7457,7458,7459,7463,7474,7482,7486,7495,7497,7500,7522,7523,7524,7525,7526,7527,7530,7545,7547,7548,7555,7558,7561,7562,7563,7574,7604,7605,7607,7615,7617,7621,7627,7629,7631,7634,7636,7637,7638,7639,7641,7643,7649,7659,7663,7695,7697,7699,7700,7702,7707,7711,7714,7718,7719,7720,7726,7727,7728,7732,7736,7744,7745,7746,7751,7753,7760,7765,7767,7771,7773,7774,7775,7776,7777,7780,7786,7792,7794,7801,7805,7806,7809,7810,7811,7816,7817,7823,7833,7835,7839,7841,7844,7845,7846,7847,7850,7851,7854,7859,7864,7865,7867,7868,7869,7870,7871,7876,7877,7881,7882,7884,7893,7899,7902,7905,7906,7907,7909,7912,7914,7920,7923,7925,7931,7932,7933,7937,7947,7954,7959,7963,7966,7973,7978,7985,7986,7995,7996,7997,7998,8001,8005,8006,8007,8010,8011,8014,8017,8019,8025,8026,8038,8041,8042,8046,8052,8055,8056,8066,8069,8072,8073,8076,8078,8085,8091,8093,8095,8097,8099,8100,8102,8103,8104,8105,8106,8111,8114,8117,8120,8128,8132,8134,8139,8140,8145,8150,8152,8161,8164,8171,8172,8174,8177,8179,8183,8185,8187,8197,8202,8205,8208,8212,8215,8221,8224,8225,8227,8228,8233,8237,8239,8244,8248,8250,8259,8269,8278,8280,8283,8318,8319,8323,8325,8329,8336,8348,8354,8362,8367,8374,8378,8385,8391,8395,8401,8403,8404,8410,8414,8417,8420,8421,8422,8424,8425,8436,8450,8454,8463,8467,8468,8480,8491,8497,8499,8510,8525,8536,8540,8542,8550,8557,8558,8580,8584,8590,8604,8609,8627,8640,8658,8721,8780,8811,8813,8815,8816,8821,8822,8824,8828,8830,8831,8841,8842,8846,8850,8852,8853,8857,8876,8877,8878,8879,8883,8888,8889,8892,8893,8897,8898,8899,8904,8920,8921,8923,8927,8932,8934,8935,8937,8939,8940,8941,8943,8951,8953,8957,8969,8970,8981,8985,8986,8998,9008,9014,9036,9038,9054,9060,9063,9070,9085,9092,9098,9103,9108,9113,9119,9132,9155,9166,9173,9189,9222,9258,9260,9265,9269,9270,9271,9272,9273,9277,9287,9288,9292,9305,9307,9311,9313,9314,9319,9321,9330,9333,9337,9338,9344,9345,9354,9388,9391,9398,9401,9410,9412,9416,9424,9431,9433,9438,9440,9441,9452,9453,9454,9456,9457,9464,9468,9486,9494,9499,9500,9513,9514,9515,9518,9524,9534,9535,9581,9604,9607,9609,9611,9622,9627,9641,9643,9647,9648,9650,9659,9674,9677,9680,9696,9709,9731,9733,9734,9737,9744,9762,9779,9780,9781,9782,9788,9818,9822,9823,9840,9846,9859,9948,9954,9955,9956,9958,9966,9974,9975,9988,10008,10010,10012,10015,10021,10024,10025,10027,10029,10032,10033,10034,10035,10037,10039,10040,10043,10053,10060,10063,10068,10073,10076,10085,10086,10090,10100,10104,10118,10127,10129,10135,10137,10138,10143,10145,10148,10149,10155,10158,10159,10162,10165,10169,10172,10173,10174,10181,10183,10184,10185,10186,10194,10196,10197,10200,10203,10206,10210,10218,10224,10228,10233,10241,10271,10276,10278,10281,10282,10283,10292,10296,10309,10310,10311,10312,10313,10314,10315,10316,10318,10319,10320,10321,10322,10323,10325,10327,10328,10329,10330,10331,10333,10335,10336,10337,10338,10339,10340,10341,10342,10343,10344,10345,10346,10348,10349,10350,10352,10353,10354,10355,10356,10357,10358,10359,10360,10361,10362,10363,10364,10365,10366,10367,10368,10369,10370,10371,10372,10373,10374,10375,10377,10378,10379,10380,10381,10383,10384,10385,10386,10388,10389,10390,10391,10392,10394,10395,10396,10397,10398,10399,10400,10401,10402,10403,10405,10406,10407,10408,10409,10410,10411,10412,10413,10414,10415,10416,10417,10419,10421,10422,10423,10424,10425,10426,10427,10428,10429,10430,10431,10432,10433,10434,10435,10436,10437,10438,10439,10440,10441,10442,10443,10444,10446,10447,10448,10449,10450,10451,10452,10453,10454,10455,10456,10457,10458,10459,10460,10461,10462,10463,10464,10465,10466,10467,10468,10470,10471,10472,10473,10474,10475,10476,10477,10478,10479,10480,10482,10483,10484,10485,10486,10487,10488,10490,10491,10492,10493,10494,10495,10496,10497,10498,10499,10501,10502,10505,10506,10507,10508,10510,10511,10512,10513,10514,10515,10516,10517,10518,10519,10520,10523,10524,10525,10526,10527,10528,10529,10531,10532,10533,10535,10536,10537,10538,10539,10540,10542,10543,10544,10545,10546,10547,10548,10550,10551,10553,10554,10555,10556,10557,10558,10559,10560,10561,10562,10564,10565,10566,10568,10569,10570,10571,10572,10573,10574,10575,10578,10579,10580,10581,10582,10583,10584,10585,10587,10588,10589,10590,10591,10592,10593,10595,10596,10598,10599,10601,10602,10603,10604,10605,10606,10607,10608,10609,10610,10611,10612,10613,10614,10615,10616,10617,10618,10619,10620,10625,10626,10627,10628,10629,10630,10631,10632,10633,10634,10635,10638,10639,10640,10642,10643,10644,10645,10646,10647,10648,10649,10650,10651,10652,10653,10654,10657,10659,10660,10661,10662,10663,10664,10665,10666,10667,10668,10669,10670,10671,10673,10674,10675,10676,10678,10679,10680,10681,10682,10683,10684,10686,10688,10689,10690,10691,10692,10693,10694,10695,10696,10697,10698,10699,10700,10702,10703,10704,10705,10706,10707,10708,10709,10710,10711,10712,10713,10714,10715,10717,10718,10719,10720,10721,10722,10723,10724,10725,10726,10728,10729,10730,10731,10733,10734,10735,10736,10737,10738,10739,10740,10741,10743,10745,10746,10747,10748,10749,10750,10751,10753,10754,10755,10756,10757,10758,10759,10760,10762,10763,10764,10765,10766,10767,10768,10770,10771,10772,10773,10774,10777,10778,10779,10782,10784,10785,10786,10788,10791,10792,10794,10795,10798,10799,10800,10801,10802,10803,10804,10805,10806,10807,10808,10813,10814,10815,10816,10817,10818,10819,10820,10821,10822,10824,10825,10826,10827,10829,10831,10833,10834,10835,10836,10837,10840,10841,10842,10843,10844,10845,10846,10847,10848,10849,10850,10851,10852,10853,10854,10855,10856,10857,10859,10860,10862,10863,10864,10865,10866,10867,10868,10869,10870,10871,10872,10873,10874,10875,10876,10877,10878,10879,10880,10881,10882,10883,10884,10885,10886,10888,10889,10890,10891,10892,10893,10894,10895,10896,10897,10898,10900,10901,10902,10903,10904,10905,10909,10910,10911,10912,10914,10916,10918,10919,10920,10921,10922,10923,10924,10925,10926,10927,10928,10929,10931,10932,10933,10934,10935,10936,10938,10939,10940,10941,10942,10943,10944,10945,10946,10947,10948,10949,10950,10951,10952,10954,10955,10956,10957,10958,10959,10960,10961,10962,10963,10965,10966,10967,10968,10970,10971,10972,10973,10974,10975,10976,10977,10978,10979,10980,10981,10982,10983,10984,10985,10986,10987,10989,10990,10991,10992,10993,10995,10997,10998,10999,11000,11001,11002,11003,11004,11005,11006,11007,11008,11009,11010,11011,11012,11014,11015,11016,11017,11018,11019,11020,11021,11022,11023,11024,11025,11026,11028,11029,11030,11031,11032,11033,11034,11035,11036,11037,11039,11040,11041,11042,11043,11045,11046,11047,11048,11049,11050,11051,11052,11053,11054,11055,11056,11057,11058,11059,11061,11062,11063,11064,11065,11066,11068,11069,11070,11071,11073,11074,11075,11076,11077,11079,11080,11082,11083,11084,11085,11086,11087,11088,11089,11090,11092,11093,11094,11096,11097,11101,11102,11103,11105,11107,11108,11109,11110,11112,11113,11114,11115,11116,11117,11118,11120,11121,11122,11123,11124,11125,11126,11127,11128,11129,11131,11132,11133,11134,11135,11137,11138,11139,11140,11142,11143,11144,11145,11147,11148,11149,11150,11151,11152,11153,11154,11155,11156,11157,11158,11159,11160,11161,11163,11164,11165,11166,11167,11168,11169,11170,11171,11172,11173,11174,11176,11177,11178,11179,11180,11181,11182,11183,11184,11185,11186,11188,11189,11190,11191,11192,11193,11195,11196,11197,11198,11199,11200,11201,11202,11203,11204,11205,11206,11207,11208,11209,11210,11211,11212,11213,11214,11215,11216,11217,11218,11219,11220,11222,11223,11224,11225,11226,11227,11228,11229,11230,11231,11232,11233,11234,11236,11237,11238,11239,11240,11241,11242,11244,11246,11247,11248,11249,11250,11251,11252,11253,11254,11255,11256,11257,11258,11259,11260,11261,11262,11263,11264,11265,11268,11269,11271,11272,11273,11274,11275,11276,11277,11278,11279,11280,11281,11282,11283,11285,11286,11287,11288,11289,11290,11291,11292,11293,11295,11296,11297,11298,11300,11301,11302,11303,11304,11305,11306,11307,11308,11309,11310,11311,11312,11313,11314,11315,11316,11317,11318,11320,11322,11323,11324,11325,11326,11327,11328,11329,11330,11331,11332,11333,11334,11335,11336,11337,11338,11339,11340,11341,11342,11343,11344,11346,11347,11348,11349,11350,11351,11352,11353,11354,11355,11356,11357,11358,11359,11360,11361,11362,11363,11364,11365,11366,11367,11368,11369,11370,11371,11372,11373,11374,11375,11377,11378,11379,11380,11381,11382,11383,11386,11387,11388,11389,11390,11391,11393,11394,11395,11396,11397,11399,11401,11402,11403,11404,11405,11406,11407,11408,11409,11410,11411,11412,11414,11415,11416,11417,11418,11419,11420,11421,11422,11423,11425,11426,11427,11428,11429,11431,11433,11434,11435,11438,11439,11440,11441,11442,11444,11445,11446,11447,11448,11449,11450,11451,11452,11453,11454,11455,11456,11457,11458,11459,11460,11461,11462,11463,11464,11465,11466,11467,11468,11469,11470,11471,11472,11473,11474,11475,11476,11477,11478,11479,11480,11481,11482,11483,11484,11485,11486,11487,11488,11489,11490,11491,11492,11493,11495,11496,11497,11498,11499,11500,11501,11502,11503,11504,11505,11506,11507,11508,11509,11510,11511,11512,11513,11515,11516,11518,11519,11520,11521,11522,11525,11526,11527,11529,11531,11532,11533,11534,11536,11537,11538,11539,11540,11542,11543,11544,11546,11547,11548,11549,11551,11553,11554,11555,11558,11559,11560,11561,11564,11565,11567,11568,11570,11572,11573,11574,11575,11577,11578,11579,11580,11581,11583,11584,11585,11586,11587,11588,11590,11592,11593,11594,11595,11597,11598,11599,11600,11601,11602,11603,11604,11605,11606,11607,11609,11611,11612,11614,11615,11617,11619,11620,11621,11622,11623,11624,11625,11626,11627,11628,11629,11631,11632,11635,11636,11638,11639,11640,11641,11642,11644,11645,11646,11647,11648,11649,11650,11651,11652,11654,11655,11656,11657,11658,11659,11660,11661,11662,11663,11665,11666,11667,11668,11669,11670,11671,11672,11673,11674,11675,11678,11679,11680,11681,11683,11684,11685,11689,11693,11694,11695,11696,11697,11698,11699,11701,11702,11703,11705,11706,11707,11708,11709,11710,11711,11712,11714,11715,11716,11717,11718,11719,11720,11721,11722,11723,11725,11726,11727,11728,11730,11731,11732,11733,11734,11735,11736,11737,11739,11740,11742,11743,11744,11745,11746,11747,11748,11751,11752,11753,11755,11756,11757,11758,11759,11760,11761,11762,11763,11764,11765,11766,11767,11768,11769,11770,11771,11773,11775,11776,11777,11778,11779,11780,11781,11782,11783,11784,11785,11786,11789,11790,11792,11793,11794,11795,11796,11797,11799,11800,11801,11802,11803,11804,11805,11806,11808,11809,11810,11811,11812,11813,11815,11816,11817,11819,11820,11821,11822,11823,11824,11825,11826,11827,11828,11829,11830,11831,11833,11834,11835,11836,11837,11838,11839,11842,11843,11844,11845,11846,11847,11848,11849,11850,11851,11852,11853,11854,11855,11856,11857,11858,11859,11860,11861,11862,11863,11864,11865,11866,11867,11868,11869,11870,11871,11872,11873,11874,11875,11876,11877,11878,11879,11880,11881,11882,11883,11884,11885,11886,11887,11888,11889,11890,11891,11893,11894,11895,11896,11897,11898,11899,11901,11902,11903,11904,11905,11906,11907,11908,11909,11910,11911,11912,11913,11914,11915,11916,11917,11918,11919,11920,11922,11923,11924,11925,11926,11927,11928,11929,11930,11931,11935,11936,11937,11939,11940,11941,11942,11943,11944,11945,11946,11947,11948,11949,11950,11951,11952,11953,11955,11956,11957,11958,11959,11960,11961,11962,11963,11966,11967,11968,11970,11971,11972,11974,11977,11978,11979,11982,11983,11984,11985,11986,11987,11988,11989,11990,11992,11993,11994,11995,11996,11997,11998,11999,12000,12001,12002,12003,12004,12005,12006,12007,12009,12010,12011,12012,12013,12014,12015,12016,12017,12018,12019,12020,12021,12022,12023,12025,12026,12027,12028,12029,12030,12031,12032,12033,12034,12035,12036,12037,12038,12039,12040,12041,12042,12043,12044,12045,12046,12047,12048,12049,12050,12051,12052,12053,12054,12055,12056,12057,12058,12059,12060,12061,12062,12063,12064,12065,12066,12067,12068,12069,12070,12071,12072,12073,12074,12075,12076,12077,12078,12079,12080,12081,12082,12083,12084,12085,12086,12087,12088,12089,12090,12091,12092,12093,12094,12095,12096,12097,12098,12099,12100,12101,12102,12103,12104,12105,12106,12107,12108,12109,12110,12111,12112,12113,12114,12115,12116,12117,12118,12119,12120,12121,12122,12123,12124,12125,12126,12127,12128,12129,12130,12131,12132,12133,12134,12135,12136,12137,12138,12139,12140,12141,12142,12143,12144,12145,12146,12147,12148,12149,12150,12152,12153,12154,12155,12156,12157,12158,12159,12160,12161,12162,12163,12164,12165,12166,12167,12168,12169,12170,12171,12172,12173,12174,12175,12176,12177,12178,12179,12180,12181,12182,12183,12184,12185,12186,12187,12188,12189,12190,12191,12192,12193,12194,12195,12196,12197,12199,12200,12201,12202,12203,12204,12205,12207,12208,12209,12210,12211,12212,12213,12214,12215,12216,12217,12218,12219,12220,12221,12222,12223,12224,12225,12226,12227,12228,12229,12230,12231,12232,12233,12234,12235,12236,12237,12238,12239,12240,12241,12242,12243,12244,12245,12246,12247,12248,12249,12250,12251,12252,12253,12254,12255,12256,12257,12258,12259,12260,12261,12262,12263,12264,12265,12266,12267,12268,12269,12270,12271,12272,12273,12274,12275,12276,12277,12278,12279,12280,12281,12282,12283,12284,12285,12286,12287,12288,12289,12290,12291,12292,12293,12294,12295,12296,12297,12298,12299,12300,12301,12302,12303,12304,12305,12306,12307,12308,12309,12310,12311,12312,12313,12314,12315,12316,12317,12318,12319,12320,12321,12322,12323,12324,12325,12326,12327,12328,12329,12330,12331,12332,12333,12334,12335,12336,12337,12338,12339,12340,12341,12342,12343,12344,12345,12346,12348,12349,12350,12351,12352,12353,12354,12355,12356,12357,12358,12360,12361,12362,12363,12364,12365,12366,12367,12368,12369,12370,12371,12372,12373,12374,12375,12376,12377,12378,12379,12380,12381,12382,12383,12384,12385,12386,12387,12388,12389,12390,12391,12392,12393,12394,12395,12396,12397,12398,12399,12400,12401,12402,12403,12404,12405,12406,12407,12408,12409,12410,12411,12412,12413,12414,12415,12416,12417,12418,12419,12420,12421,12422,12423,12424,12425,12426,12427,12428,12429,12430,12431,12432,12433,12434,12435,12436,12437,12438,12439,12440,12441,12442,12444,12445,12446,12448,12450,12452,12454,12455,12458,12459,12460,12462,12463,12465,12466,12467,12468,12469,12470,12471,12472,12473,12474,12475,12476,12477,12479,12483,12484,12485,12486,12487,12488,12490,12493,12494,12495,12497,12498,12499,12501,12502,12504,12505,12506,12508,12509,12510,12511,12514,12515,12516,12517,12518,12519,12521,12522,12524,12525,12528,12531,12532,12533,12535,12536,12537,12540,12541,12543,12544,12548,12549,12550,12553,12554,12558,12560,12563,12564,12565,12566,12568,12570,12573,12574,12576,12584,12585,12590,12596,12599,12600,12601,12602,12603,12604,12605,12606,12607,12608,12609,12611,12614,12615,12616,12617,12618,12619,12620,12621,12622,12623,12624,12625,12626,12627,12629,12630,12631,12633,12634,12635,12636,12637,12638,12640,12642,12643,12644,12645,12646,12647,12649,12650,12651,12652,12653,12654,12655,12656,12658,12659,12661,12662,12663,12664,12666,12667,12668,12669,12671,12672,12674,12675,12676,12677,12678,12679,12680,12681,12682,12683,12684,12685,12686,12687,12688,12689,12690,12691,12692,12693,12694,12695,12696,12697,12698,12699,12700,12702,12704,12705,12706,12707,12708,12709,12710,12712,12713,12714,12715,12716,12717,12718,12721,12723,12724,12725,12726,12727,12729,12730,12731,12733,12734,12736,12737,12738,12739,12740,12741,12742,12743,12744,12745,12747,12748,12749,12751,12752,12753,12754,12755,12756,12758,12759,12760,12761,12762,12763,12764,12765,12766,12767,12768,12770,12771,12772,12775,12776,12778,12779,12780,12781,12783,12784,12785,12786,12788,12789,12790,12791,12792,12793,12794,12795,12796,12797,12798,12799,12800,12801,12802,12803,12805,12807,12808,12809,12810,12812,12813,12814,12815,12816,12817,12819,12821,12823,12824,12825,12826,12827,12829,12830,12831,12833,12835,12836,12842,12843,12844,12845,12846,12847,12848,12850,12851,12852,12854,12856,12857,12858,12859,12860,12861,12862,12863,12864,12865,12866,12868,12869,12871,12872,12873,12874,12875,12876,12878,12879,12880,12881,12883,12884,12885,12886,12887,12888,12889,12890,12891,12892,12893,12894,12895,12896,12897,12898,12899,12900,12901,12902,12903,12904,12906,12907,12908,12909,12910,12911,12912,12914,12915,12916,12917,12918,12919,12920,12921,12922,12923,12924,12925,12926,12929,12930,12931,12932,12933,12934,12935,12936,12937,12938,12939,12940,12941,12942,12943,12944,12945,12946,12948,12949,12950,12951,12952,12953,12954,12955,12957,12958,12960,12961,12962,12963,12964,12965,12966,12967,12968,12969,12970,12972,12974,12975,12976,12978,12979,12981,12982,12984,12985,12986,12987,12990,12991,12992,12993,12995,12997,12998,12999,13000,13001,13002,13003,13004,13006,13007,13008,13009,13010,13011,13012,13013,13014,13016,13018,13020,13022,13023,13024,13025,13026,13027,13030,13038,13039,13040,13043,13045,13046,13047,13048,13049,13050,13051,13053,13054,13055,13056,13057,13058,13059,13060,13061,13062,13063,13064,13065,13066,13067,13068,13071,13072,13073,13075,13077,13078,13079,13081,13082,13083,13084,13085,13087,13088,13089,13090,13091,13092,13093,13094,13095,13096,13097,13098,13099,13101,13102,13103,13104,13105,13107,13108,13109,13111,13112,13113,13114,13115,13116,13117,13118,13119,13120,13121,13122,13123,13124,13125,13126,13127,13129,13130,13131,13133,13134,13135,13136,13137,13138,13140,13141,13142,13143,13144,13147,13148,13149,13150,13151,13153,13154,13155,13156,13157,13158,13160,13162,13163,13164,13166,13167,13168,13170,13171,13173,13174,13175,13176,13177,13178,13179,13182,13183,13184,13185,13187,13188,13189,13190,13191,13193,13194,13195,13196,13197,13198,13199,13200,13202,13203,13204,13205,13206,13207,13208,13209,13210,13211,13212,13213,13214,13215,13216,13217,13218,13220,13221,13223,13224,13225,13227,13228,13229,13230,13231,13232,13233,13234,13235,13236,13237,13238,13239,13240,13241,13244,13245,13246,13247,13248,13250,13251,13252,13253,13254,13255,13256,13257,13259,13261,13262,13263,13264,13265,13266,13267,13268,13269,13270,13271,13272,13273,13274,13275,13276,13277,13278,13279,13280,13281,13282,13283,13284,13285,13286,13288,13289,13290,13291,13293,13294,13295,13296,13297,13298,13299,13300,13301,13302,13303,13304,13305,13306,13307,13308,13309,13311,13312,13315,13317,13318,13319,13320,13321,13322,13323,13324,13325,13326,13327,13329,13330,13331,13332,13333,13334,13335,13336,13337,13338,13340,13341,13342,13343,13344,13348,13349,13350,13351,13353,13354,13356,13358,13360,13361,13362,13365,13366,13367,13369,13370,13372,13373,13375,13376,13377,13378,13379,13381,13382,13383,13384,13386,13388,13389,13390,13392,13393,13394,13395,13396,13397,13398,13399,13400,13401,13403,13404,13405,13406,13408,13409,13410,13411,13412,13413,13414,13415,13417,13418,13419,13420,13421,13423,13424,13425,13426,13427,13429,13430,13431,13432,13434,13435,13436,13438,13440,13441,13442,13443,13445,13446,13447,13449,13451,13452,13453,13456,13458,13459,13460,13461,13462,13466,13467,13468,13469,13470,13472,13474,13475,13477,13478,13479,13484,13485,13487,13489,13490,13491,13493,13494,13497,13498,13499,13500,13501,13503,13504,13506,13507,13509,13510,13511,13513,13517,13519,13520,13521,13524,13526,13527,13529,13530,13531,13533,13534,13535,13538,13541,13542,13543,13544,13545,13546,13547,13548,13549,13550,13551,13552,13553,13554,13555,13557,13558,13560,13561,13562,13564,13565,13566,13567,13568,13569,13570,13571,13572,13573,13578,13579,13581,13582,13584,13586,13587,13590,13592,13593,13597,13598,13599,13600,13601,13602,13603,13604,13605,13606,13607,13608,13609,13610,13611,13612,13614,13616,13618,13621,13622,13623,13624,13625,13627,13629,13630,13631,13633,13634,13636,13637,13638,13640,13641,13642,13643,13644,13645,13646,13648,13650,13651,13652,13653,13654,13655,13656,13657,13658,13661,13665,13666,13667,13668,13671,13675,13679,13680,13681,13682,13683,13684,13685,13686,13687,13689,13690,13694,13695,13696,13697,13698,13699,13700,13702,13703,13704,13705,13706,13707,13708,13709,13710,13711,13712,13713,13716,13717,13718,13719,13721,13722,13725,13727,13729,13730,13731,13732,13733,13734,13735,13739,13740,13741,13742,13743,13745,13746,13749,13751,13753,13755,13757,13758,13759,13762,13763,13764,13766,13767,13768,13769,13770,13771,13772,13773,13774,13775,13776,13777,13778,13779,13781,13783,13785,13786,13787,13788,13790,13792,13794,13795,13796,13798,13799,13800,13801,13803,13804,13805,13806,13807,13809,13810,13811,13812,13813,13814,13815,13818,13819,13820,13822,13823,13824,13826,13828,13829,13831,13832,13833,13834,13836,13837,13838,13840,13842,13843,13844,13845,13846,13847,13849,13850,13851,13853,13854,13855,13856,13857,13858,13859,13860,13861,13863,13864,13865,13866,13867,13868,13869,13870,13871,13872,13874,13875,13876,13877,13878,13879,13881,13882,13883,13885,13886,13887,13888,13889,13890,13891,13892,13893,13895,13896,13897,13898,13899,13900,13901,13902,13903,13904,13906,13907,13908,13909,13910,13911,13912,13915,13917,13918,13919,13920,13921,13922,13923,13924,13925,13926,13927,13928,13930,13931,13932,13934,13935,13936,13937,13938,13940,13941,13943,13945,13947,13948,13949,13950,13951,13952,13953,13954,13955,13956,13957,13958,13962,13963,13965,13967,13968,13969,13970,13971,13972,13973,13974,13976,13977,13978,13979,13980,13981,13982,13983,13984,13986,13987,13988,13989,13990,13991,13992,13993,13994,13995,13996,13997,13998,14000,14001,14002,14003,14005,14006,14007,14008,14011,14012,14014,14016,14018,14019,14020,14021,14022,14023,14024,14025,14027,14028,14030,14031,14033,14034,14036,14037,14038,14039,14040,14041,14042,14043,14044,14045,14046,14047,14049,14050,14052,14055,14056,14057,14058,14059,14060,14061,14062,14063,14065,14066,14067,14068,14069,14070,14071,14072,14073,14074,14075,14077,14078,14080,14081,14082,14083,14084,14085,14086,14087,14088,14089,14090,14091,14093,14094,14095,14096,14097,14098,14099,14100,14101,14102,14103,14104,14105,14106,14107,14108,14109,14110,14112,14113,14114,14115,14116,14117,14118,14119,14120,14121,14122,14123,14124,14125,14126,14127,14128,14129,14130,14131,14132,14133,14134,14135,14140,14141,14142,14143,14144,14145,14146,14148,14149,14150,14151,14153,14154,14155,14156,14157,14158,14159,14160,14161,14162,14163,14164,14165,14167,14168,14170,14171,14172,14173,14175,14176,14177,14178,14179,14181,14182,14183,14185,14186,14187,14188,14189,14190,14191,14192,14193,14195,14196,14197,14198,14199,14200,14204,14205,14206,14207,14208,14209,14210,14211,14212,14214,14216,14217,14218,14219,14220,14221,14222,14224,14225,14226,14227,14228,14229,14230,14231,14232,14233,14234,14235,14237,14238,14239,14240,14241,14242,14243,14245,14246,14247,14249,14250,14251,14252,14253,14255,14257,14258,14259,14260,14261,14262,14264,14266,14267,14268,14269,14270,14271,14272,14274,14275,14276,14277,14278,14279,14280,14281,14282,14283,14284,14285,14286,14287,14288,14289,14290,14292,14293,14294,14295,14296,14297,14298,14299,14301,14302,14303,14304,14305,14306,14307,14308,14309,14310,14311,14312,14313,14314,14315,14316,14317,14318,14319,14320,14321,14322,14323,14324,14325,14326,14327,14328,14329,14330,14331,14332,14333,14334,14336,14337,14338,14339,14340,14342,14343,14344,14345,14346,14347,14348,14349,14350,14351,14352,14353,14354,14355,14356,14357,14359,14360,14361,14362,14363,14364,14365,14366,14367,14368,14369,14370,14371,14372,14373,14374,14376,14378,14379,14380,14381,14382,14383,14384,14385,14386,14387,14388,14389,14390,14391,14392,14393,14394,14395,14397,14398,14399,14400,14401,14402,14403,14404,14405,14406,14407,14408,14409,14410,14411,14412,14414,14415,14416,14417,14418,14419,14421,14422,14423,14424,14425,14426,14427,14428,14429,14430,14431,14432,14433,14435,14436,14437,14438,14439,14440,14441,14442,14443,14445,14447,14448,14449,14450,14451,14452,14453,14454,14455,14456,14457,14461,14462,14464,14465,14466,14467,14468,14469,14470,14471,14472,14473,14474,14476,14478,14479,14480,14481,14482,14484,14485,14486,14487,14488,14489,14490,14491,14492,14494,14495,14496,14497,14498,14500,14501,14502,14507,14509,14510,14514,14515,14519,14520,14521,14523,14524,14525,14526,14527,14528,14529,14530,14531,14533,14534,14535,14536,14538,14539,14540,14541,14546,14547,14548,14549,14550,14551,14553,14554,14555,14556,14557,14560,14561,14562,14563,14564,14565,14566,14567,14568,14570,14571,14572,14574,14575,14576,14581,14582,14583,14585,14586,14587,14588,14589,14590,14591,14592,14593,14594,14596,14597,14598,14603,14604,14606,14607,14608,14609,14610,14612,14613,14614,14615,14616,14617,14619,14620,14621,14623,14624,14625,14628,14630,14631,14632,14634,14635,14636,14637,14639,14640,14642,14643,14645,14646,14648,14649,14650,14652,14653,14656,14657,14658,14659,14660,14661,14662,14663,14665,14666,14667,14669,14670,14671,14672,14673,14674,14676,14677,14678,14679,14680,14682,14683,14684,14685,14686,14687,14689,14690,14694,14695,14696,14697,14698,14699,14700,14701,14703,14705,14706,14707,14708,14709,14710,14711,14712,14713,14714,14719,14720,14721,14724,14726,14727,14729,14730,14732,14733,14734,14735,14736,14737,14738,14740,14741,14742,14744,14745,14746,14747,14748,14749,14750,14751,14752,14753,14754,14755,14756,14757,14758,14759,14761,14762,14766,14768,14769,14770,14772,14774,14775,14776,14777,14778,14779,14780,14782,14783,14785,14786,14787,14788,14789,14791,14792,14793,14796,14797,14798,14799,14800,14804,14805,14806,14807,14808,14809,14810,14812,14813,14814,14815,14817,14818,14819,14820,14822,14823,14824,14825,14827,14828,14829,14831,14832,14833,14834,14835,14836,14837,14838,14839,14840,14841,14842,14843,14844,14845,14847,14848,14849,14850,14852,14853,14854,14855,14856,14857,14859,14860,14861,14862,14863,14864,14865,14866,14868,14869,14871,14872,14873,14874,14876,14877,14878,14879,14880,14882,14883,14884,14885,14886,14887,14888,14889,14890,14891,14892,14893,14894,14895,14896,14897,14899,14900,14901,14902,14903,14904,14906,14907,14909,14910,14911,14912,14913,14914,14915,14917,14918,14919,14920,14921,14922,14923,14924,14925,14926,14927,14928,14929,14930,14931,14932,14933,14934,14935,14936,14937,14938,14939,14940,14941,14942,14943,14944,14945,14947,14949,14950,14951,14952,14954,14955,14956,14957,14959,14960,14961,14963,14964,14965,14966,14967,14968,14969,14970,14971,14972,14976,14977,14979,14980,14982,14983,14985,14986,14987,14988,14989,14990,14991,14992,14993,14994,14995,14996,14997,14998,14999,15000,15001,15002,15003,15004,15005,15006,15007,15008,15009,15011,15013,15014,15015,15016,15017,15018,15019,15020,15021,15022,15023,15024,15025,15026,15027,15028,15029,15030,15032,15033,15034,15035,15037,15038,15039,15040,15041,15042,15043,15044,15045,15047,15048,15050,15051,15052,15053,15055,15056,15057,15059,15060,15061,15062,15063,15065,15066,15067,15068,15069,15070,15072,15073,15076,15078,15079,15081,15082,15083,15084,15085,15086,15087,15090,15091,15092,15093,15094,15095,15096,15097,15098,15099,15101,15103,15104,15105,15106,15107,15108,15109,15110,15111,15112,15113,15115,15116,15117,15118,15119,15120,15121,15122,15124,15125,15126,15127,15128,15132,15133,15134,15135,15136,15138,15139,15140,15141,15142,15143,15144,15145,15146,15148,15149,15150,15151,15153,15154,15155,15157,15159,15160,15161,15162,15163,15164,15165,15166,15167,15168,15170,15171,15172,15173,15174,15175,15176,15177,15178,15179,15180,15181,15182,15183,15184,15185,15186,15187,15188,15189,15190,15191,15192,15193,15194,15195,15196,15197,15199,15200,15201,15202,15203,15204,15205,15207,15208,15209,15210,15211,15212,15213,15214,15215,15216,15217,15218,15219,15220,15221,15222,15223,15224,15225,15226,15228,15229,15230,15231,15232,15233,15234,15236,15237,15238,15239,15240,15241,15242,15243,15244,15245,15246,15247,15248,15249,15250,15251,15252,15253,15254,15255,15256,15257,15258,15259,15260,15261,15262,15263,15264,15265,15266,15267,15268,15269,15270,15271,15272,15273,15274,15275,15276,15277,15278,15279,15280,15281,15282,15283,15284,15285,15286,15287,15288,15289,15290,15291,15292,15293,15294,15295,15296,15297,15298,15299,15300,15301,15302,15304,15305,15309,15314,15315,15316,15317,15319,15320,15321,15323,15325,15327,15328,15329,15330,15331,15332,15334,15335,15336,15337,15338,15340,15341,15342,15344,15345,15346,15348,15349,15350,15351,15352,15353,15354,15355,15356,15357,15358,15359,15360,15361,15362,15363,15364,15365,15366,15368,15369,15370,15371,15372,15373,15374,15375,15376,15377,15378,15379,15380,15381,15382,15383,15384,15385,15386,15387,15388,15389,15390,15391,15392,15393,15394,15395,15396,15397,15398,15399,15400,15401,15402,15403,15404,15405,15406,15407,15408,15409,15410,15411,15412,15413,15414,15415,15416,15417,15418,15419,15420,15421,15423,15424,15425,15426,15427,15428,15429,15430,15431,15433,15434,15435,15436,15437,15438,15439,15440,15441,15442,15443,15444,15445,15446,15447,15448,15449,15450,15451,15452,15453,15454,15455,15456,15457,15458,15459,15460,15461,15462,15463,15464,15465,15466,15467,15468,15469,15470,15471,15472,15473,15474,15475,15476,15477,15478,15479,15480,15481,15482,15483,15484,15485,15486,15487,15488,15489,15490,15491,15492,15493,15494,15495,15496,15497,15498,15499,15500,15501,15502,15503,15504,15505,15506,15507,15508,15509,15510,15511,15512,15513,15514,15515,15516,15517,15518,15519,15520,15521,15522,15523,15524,15525,15526,15527,15528,15529,15530,15531,15532,15533,15534,15535,15536,15537,15538,15539,15540,15541,15542,15543,15544,15545,15546,15547,15548,15549,15550,15551,15552,15553,15554,15555,15556,15557,15558,15559,15560,15561,15562,15563,15564,15565,15566,15567,15568,15569,15570,15571,15572,15573,15574,15575,15576,15577,15578,15579,15580,15581,15582,15583,15584,15585,15586,15587,15588,15589,15590,15591,15592,15593,15594,15595,15596,15597,15598,15599,15600,15601,15602,15603,15604,15605,15606,15607,15608,15609,15610,15611,15612,15613,15614,15615,15616,15617,15618,15619,15620,15621,15622,15624,15625,15626,15627,15628,15629,15630,15631,15632,15633,15634,15635,15636,15637,15638,15639,15640,15641,15642,15643,15644,15645,15646,15647,15648,15649,15650,15651,15652,15653,15655,15656,15657,15658,15659,15660,15661,15662,15663,15664,15665,15666,15667,15668,15669,15670,15671,15672,15673,15674,15675,15676,15677,15678,15679,15680,15681,15682,15683,15684,15685,15686,15687,15688,15689,15690,15691,15692,15693,15694,15695,15696,15697,15698,15699,15700,15701,15702,15703,15704,15705,15706,15707,15708,15709,15710,15711,15712,15713,15714,15715,15716,15717,15718,15719,15720,15721,15722,15723,15724,15725,15726,15727,15728,15729,15730,15731,15732,15733,15734,15735,15736,15737,15738,15739,15740,15741,15742,15743,15744,15745,15746,15747,15748,15749,15750,15751,15752,15753,15754,15755,15756,15757,15758,15759,15760,15761,15762,15763,15764,15765,15766,15767,15768,15769,15770,15771,15772,15773,15774,15775,15777,15778,15779,15780,15781,15784,15785,15787,15788,15789,15790,15791,15792,15793,15794,15795,15798,15800,15801,15802,15803,15804,15805,15806,15807,15808,15809,15812,15813,15814,15815,15816,15817,15818,15820,15821,15824,15825,15829,15831,15834,15835,15837,15838,15841,15842,15843,15845,15846,15847,15850,15851,15852,15853,15855,15857,15858,15860,15861,15863,15864,15866,15867,15869,15870,15873,15875,15877,15878,15880,15881,15882,15883,15885,15886,15888,15891,15895,15898,15900,15902,15906,15907,15908,15910,15912,15913,15916,15917,15920,15921,15924,15927,15937,15942,15948,15969,15970,15978,15979,15993,15994,16009,16012,16157,16158,16159,16161,16162,16163,16164,16165,16166,16167,16168,16169,16170,16171,16172,16173,16174,16175,16176,16177,16180,16181,16183,16184,16185,16186,16188,16190,16191,16193,16194,16195,16196,16202,16203,16204,16206,16207,16208,16212,16214,16216,16218,16219,16222,16224,16225,16226,16227,16228,16230,16235,16240,16244,16245,16246,16247,16257,16261,16266,16267,16287,16291,16307,16308,16318,16323,16331,16332,16337,16349,16351,16360,16362,16367,16371,16373,16378,16394,16396,16399,16414,16418,16425,16426,16452,16456,16459,16486,16492,16493,16498,16511,16513,16519,16555,16556,16559,16562,16570,16742,16743,16744,16745,16748,16750,16751,16752,16756,16763,16765,16767,16771,16773,16774,16776,16777,16778,16784,16785,16787,16789,16790,16791,16793,16795,16796,16798,16799,16803,16808,16809,16811,16816,16817,16825,16829,16830,16833,16834,16836,16837,16839,16840,16846,16848,16849,16852,16856,16857,16859,16860,16861,16862,16863,16866,16874,16875,16877,16880,16887,16888,16889,16893,16896,16897,16898,16899,16902,16905,16906,16911,16912,16914,16916,16919,16922,16923,16925,16926,16927,16928,16930,16942,16952,16955,16956,16958,16961,16962,16967,16973,16975,16979,16983,16995,16997,17005,17006,17013,17023,17024,17041,17043,17058,17059,17062,17066,17070,17071,17073,17077,17081,17083,17089,17098,17102,17105,17117,17121,17127,17128,17133,17140,17144,17149,17154,17177,17225,17227,17228,17229,17234,17239,17242,17245,17246,17251,17253,17258,17260,17262,17265,17269,17270,17271,17272,17279,17287,17289,17291,17298,17306,17307,17351,17353,17354,17356,17357,17358,17359,17361,17372,17524,18056,18057,18062,18066,18067,18073,18077,18078,18079,18080,18081,18082,18085,18086,18087,18088,18089,18094,18097,18099,18101,18107,18110,18112,18113,18114,18115,18117,18118,18140,18141,18145,18147,18156,18157,18160,18161,18162,18166,18168,18170,18174,18176,18177,18180,18181,18184,18187,18188,18192,18193,18199,18201,18202,18209,18211,18212,18213,18214,18216,18221,18222,18223,18224,18233,18235,18240,18241,18247,18250,18253,18256,18257,18268,18275,18285,18288,18294,18303,18408,18410,18413,18414,18415,18416,18418,18420,18423,18424,18425,18426,18427,18429,18432,18433,18434,18437,18441,18446,18448,18449,18452,18460,18463,18478,18482,18483,18484,18485,18486,18491,18495,18496,18500,18501,18502,18503,18504,18507,18508,18509,18512,18517,18523,18529,18530,18532,18536,18537,18538,18549,18550,18551,18565,18566,18571,18575,18576,18580,18584,18585,18588,18599,18614,18622,18624,18625,18628,18629,18630,18631,18636,18637,18639,18645,18664,18666,18678,18679,18681,18686,18688,18692,18695,18697,18701,18707,18710,18716,18718,18738,18744,18745,18770,18774,18777,18779,18782,18784,18785,18786,18793,18803,18804,18806,18827,18829,18840,18848,18861,18918,18919,18921,18925,18931,18933,18934,19061,19062,19063,19065,19066,19067,19069,19070,19071,19073,19074,19076,19077,19078,19079,19080,19082,19088,19089,19091,19094,19095,19096,19100,19101,19104,19108,19111,19150,19160,19166,19167,19216,19301,19309,19310,19311,19312,19313,19314,19317,19318,19322,19324,19327,19329,19333,19334,19336,19339,19343,19346,19350,19353,19564,19565,19566,19567,19568,19569,19571,19572,19574,19577,19579,19580,19582,19586,19588,19590,19591,19595,19596,19599,19601,19607,19610,19617,19620,19624,19640,19667,19672,19715,19772,19777,19778,19780,19791,19796,20092,20097,20109,20124,20132,20152,20163,20182,20190,20511,20513,20515,20517,20518,20525,20527,20531,20533,20541,20543,20547,20549,20554,20559,20580,20592,20607,20627,20646,20667,20676,20685,20686,20689,20692,20696,20750,20755,20768,20795,20816,20863,20868,20875,20889,20890,20895];
  var PY_VALS = ["yi","ding","qi","wan","zhang","san","shang","xia","bu","yu","chou","zhuan","qie","shi","qiu","bing","ye","cong","dong","si","diu","liang","yan","sang","ge","ya","zhong","feng","chuan","lin","wan","dan","wei","zhu","li","ju","nai","jiu","me","yi","zhi","wu","zha","hu","fa","le","ping","pang","qiao","guai","cheng","yi","jiu","qi","ye","xi","xiang","shu","mai","luan","ru","qian","le","yu","zheng","shi","er","yu","kui","yun","hu","wu","jing","ya","xie","wang","kang","jiao","hai","yi","chan","heng","mu","xiang","jing","ting","liang","qin","ren","yi","shen","ren","jin","pu","chou","jin","jie","reng","cong","lun","cang","zai","shi","ta","zhang","fu","xian","qian","dai","ling","yi","yi","men","yang","zhong","jian","jia","ren","fen","fang","qi","yi","wu","ji","fu","fa","xiu","zhong","you","huo","hui","san","wei","chuan","shang","lun","wei","bo","gu","ban","ling","shen","ci","shi","dian","dan","wei","di","zhu","zuo","you","ti","he","yu","fu","zuo","ni","yong","pei","lao","yang","bai","jia","shi","zhi","chi","li","shi","dong","gong","yi","xia","lv","jiao","zhen","ce","qiao","kuai","wu","hou","qin","bian","cu","e","jun","qiao","li","su","fu","bao","yu","xin","lia","jian","xiu","fu","ju","an","bei","dao","jue","tang","hou","yi","jie","chang","juan","ni","zhai","zhi","qing","jia","pian","zuo","ting","jian","ou","tou","chang","gui","fu","li","bang","dai","chu","cui","ao","sha","xiang","liao","seng","su","jiang","pi","ru","lei","er","yun","yuan","xiong","chong","zhao","xian","guang","ke","mian","dui","tu","dang","dou","jing","ru","quan","ba","gong","liu","lan","gong","guan","xing","bing","qi","ju","dian","zi","yang","jian","shou","ji","nei","gang","ran","ce","zai","mao","mian","rong","xie","jun","nong","guan","yuan","dong","feng","bing","chong","jue","kuang","ye","leng","dong","jing","qi","zhun","liang","diao","ling","jian","cou","lin","ning","ji","fan","feng","ping","kai","huang","deng","xiong","tu","ao","chu","ji","han","zao","dao","diao","ren","fen","qie","kan","xing","hua","lie","liu","ze","gang","chuang","chu","shan","pan","pao","li","bie","gua","dao","zhi","shua","quan","sha","ci","ke","gui","duo","ji","ti","xue","qian","gua","jian","ti","pou","bo","ju","sheng","jian","fu","ge","jiao","pi","li","quan","ban","gong","jia","wu","lie","dong","zhu","nu","jie","li","jin","lao","shi","bo","yong","mian","xun","lei","kan","mu","qin","shao","gou","wu","yun","bao","cong","xiong","hua","bei","shi","za","jiang","kuang","xia","fei","pi","qu","yi","ni","shi","qian","sheng","wu","hui","ban","hua","xie","bei","zu","zhuo","dan","mai","nan","bo","bo","bian","zhan","ka","lu","lu","wo","wei","mao","yin","wei","ji","que","luan","juan","xie","qing","chang","e","ting","li","li","ya","yan","ce","li","hou","yuan","xiang","sha","chu","jiu","qu","xian","san","can","you","cha","ji","you","shuang","fan","fa","shu","qu","shou","bian","xu","pan","die","kou","gu","ju","ling","zhi","jiao","zhao","ba","ding","ke","tai","shi","you","ye","hao","si","tan","diao","xu","chi","ge","he","ji","diao","tong","ming","hou","li","tu","xiang","xia","lv","ma","jun","lin","tun","yin","fei","fou","ba","dun","fen","han","ting","keng","shun","qi","zhi","wu","chao","xi","chui","wen","hou","wu","ya","dai","cheng","gao","na","ou","yuan","qiang","wu","ne","zhou","wei","he","pei","shen","hu","ming","ju","pao","za","he","jiu","yong","fu","zhou","gu","ka","long","zi","yao","ge","zan","ke","xian","yan","ai","pin","hong","duo","wa","ha","zai","xiang","ai","ya","hua","yo","ge","o","shao","li","na","ku","xiao","zhe","bu","heng","yan","suo","chun","ai","tang","huan","hu","shou","wei","chang","tuo","ken","zhuo","shang","a","fei","pi","sha","la","pa","nie","xiao","ti","ka","wei","shan","la","hou","han","chuan","xi","he","xuan","zha","pen","yu","xiu","sang","shi","weng","si","sou","jia","ga","xu","ma","zhu","chao","zui","si","xi","hei","ye","qi","zao","shi","ga","hao","ti","xiao","rang","jue","nang","qiu","si","hui","yin","tuan","dun","yuan","kun","cong","wei","gu","guo","tu","pu","yuan","quan","tu","sheng","zai","gui","di","chang","ji","zhi","jun","fang","tan","kan","huai","zuo","keng","kuai","jian","tan","ba","wu","fen","zhui","po","kun","tan","ping","pi","ke","chui","la","long","xing","lei","duo","gou","yuan","ken","dian","kua","geng","ai","mai","cheng","pu","yu","bu","pei","ji","tang","dui","qian","duo","bao","di","kan","yan","du","ta","su","ta","tang","sai","tian","jing","shu","shang","mu","qiang","zeng","xu","mo","dun","bi","hao","rang","shi","ren","zhuang","sheng","ke","hu","yi","chu","bei","fu","xia","xi","wai","duo","ye","gou","da","tian","tai","fu","yang","hang","shi","tou","yi","kua","jia","duo","yan","qi","nai","feng","fen","kui","zou","qi","ben","jiang","tao","dian","she","ao","nv","nu","nai","jian","ta","hao","ru","wang","zhuang","fu","ma","ren","du","ji","yao","miao","tuo","fang","ni","mei","qi","mu","shi","jie","gu","xing","wei","yao","jiang","lao","yi","ji","yin","zi","wei","wa","lou","jiao","niang","na","juan","shen","e","mian","yu","qu","po","wan","hun","lan","ying","shen","xu","mei","mei","xi","jia","sao","ji","xian","di","nen","zi","kong","yun","zi","cun","sun","zi","xiao","meng","ji","gu","xue","hai","luan","shu","fu","ru","nie","ning","ta","zhai","yu","shou","an","song","wan","hong","zong","guan","zhou","ding","wan","yi","bao","shi","chong","shen","ke","xuan","shi","huan","xian","gong","zai","hai","yan","xiao","jia","rong","kuan","bin","su","ji","ji","yin","mi","kou","fu","mei","han","yu","qin","mo","cha","gua","liao","zhai","cun","dui","si","xun","dao","shou","feng","she","jiang","wei","zun","xiao","shao","er","jian","chen","shang","chang","you","yao","jiu","shi","yin","chi","ni","jin","wei","niao","ju","pi","ceng","ju","qu","ti","jie","wu","shi","ping","xie","zhan","shu","tu","lv","lv","tun","shan","yi","yu","sui","qi","cha","gang","dao","yan","ling","yue","an","kui","zhi","xia","luan","e","yu","qiao","feng","jun","chong","qi","cui","ya","beng","zhan","qian","wei","chuan","zhou","xun","chao","gong","zuo","qiao","ju","gong","wu","cha","ji","yi","si","ba","xiang","jin","bi","shi","bu","shuai","fan","shi","xi","zhang","pa","tie","lian","zhou","bo","zhi","di","dai","zhen","xi","bang","chang","mao","mi","fu","huang","mu","chuang","gan","ping","nian","bing","xing","huan","you","you","guang","zhuang","qing","bi","chuang","xu","lu","ku","ying","di","dian","miao","geng","fu","pang","fei","du","zuo","ting","shu","kang","yong","lian","lang","kuo","liao","yan","ting","jian","kai","yi","qi","nong","bi","shi","gong","yin","fu","hong","chi","di","zhang","mi","xian","hu","wan","ruo","dan","qiang","gui","dang","lu","yi","xing","tong","yan","cai","biao","bin","peng","zhang","ying","yi","che","bi","wang","zheng","jing","dai","hen","huai","lv","xu","tu","de","pai","yu","xun","wei","de","hui","xin","bi","yi","ji","ren","zhi","wang","mang","zhong","you","kuai","chen","nian","xin","hu","fen","huai","tai","song","zen","nu","zheng","pa","bu","lian","si","dai","ji","xing","yuan","guai","qie","zong","shi","lian","huang","kong","heng","shu","hui","xu","hen","en","dong","tian","gong","xi","qia","ken","e","nao","yong","qiao","xi","han","hui","wu","you","huan","yue","nin","xuan","min","bei","ji","dao","qing","jing","wan","huo","ti","xi","wei","hui","dian","ju","can","cheng","bei","can","dan","guan","duo","xiang","huang","re","xing","chou","yu","yu","yi","yu","gan","fen","kui","yuan","ci","huang","shen","she","mu","man","hui","kai","wei","kang","bie","zeng","han","han","dong","xie","ao","lan","nuo","ge","wu","xu","shu","rong","xi","cheng","wo","jie","huo","zhan","qi","jie","lu","chuo","dai","hu","fang","suo","bian","shan","shou","cai","zha","pu","ba","da","reng","tuo","kang","kou","qian","zhi","kuo","sao","yang","niu","ban","che","rao","ban","fu","pi","e","zhao","cheng","ji","chao","jue","ba","yi","shu","zhua","tou","dou","kang","zhe","fu","pao","kou","lun","qiang","hu","bao","peng","pi","tai","bao","di","mo","ya","chou","min","fu","zhu","dan","chai","mu","nian","la","ban","pai","lin","guai","ju","tuo","ba","tuo","ju","zhuo","zhao","bai","ni","long","jian","yong","lan","ning","bo","ze","kuo","shi","zheng","gong","quan","shuan","kao","pin","zhuai","shi","na","chi","gua","zhi","an","kua","tiao","wa","zhi","luan","wo","ta","xie","nao","dang","zheng","ji","hui","ai","nuo","cuo","zhen","ting","wan","wu","tong","kun","zhuo","ba","han","shao","nie","juan","bu","lao","sun","jian","huan","dao","peng","ju","chui","jie","nian","xian","dian","duo","shou","diao","zhang","tao","qia","pai","ye","jue","lve","tan","che","jie","kong","tui","yan","cuo","lu","zhi","dan","can","rou","zou","miao","ti","cha","yi","wo","chuai","kai","jiu","jie","yuan","lan","chan","ge","lou","jiao","bo","chu","cuo","sao","sou","gao","tang","ban","da","xie","cha","she","bai","yao","bin","tan","shuai","zhai","cui","mo","mo","mo","liao","jue","pie","cheng","sa","si","zhuang","che","liao","qiao","bo","cuo","zhuan","nian","han","lei","shan","cao","qing","qin","sou","ca","pan","zan","rang","jue","zhi","shou","gai","gong","fang","zheng","gu","xiao","di","min","jiu","ao","jiao","lian","bi","chang","gan","san","dun","jing","shu","qiao","zheng","fu","wen","zhai","bin","ban","dou","liao","xie","zhen","wo","jin","chi","fu","zhan","duan","si","xin","fang","shi","pang","lv","xuan","zu","qi","wu","ji","ri","dan","jiu","zhi","zao","xun","xu","han","shi","kuang","wang","ang","kun","chang","ming","hun","yi","xi","xing","ying","chun","mei","zuo","zhao","shi","zhou","xian","huang","jin","shang","shai","xiao","yun","wan","wu","hui","chen","pu","jing","xi","qing","jing","zhi","liang","zan","xia","shu","nuan","an","mu","bao","shu","pu","yue","qu","ye","geng","cao","man","ceng","ti","zui","yue","you","peng","fu","shuo","lang","wang","chao","qi","mu","wei","mo","ben","zha","shu","zhu","pu","duo","ji","xiu","sha","za","quan","gan","shan","li","xing","cai","cun","zhang","du","shu","gang","tiao","lai","yang","hang","bei","jie","song","ban","ji","gou","wang","xi","zhen","lin","mei","guo","zhi","shu","zao","qiang","feng","ku","jia","jia","bing","bai","mou","gan","qi","ran","rou","gui","zha","ning","cha","jian","ke","zhu","liu","chai","shi","zha","biao","zhan","dong","lan","shu","shuan","qi","li","xiao","zhu","yang","he","gen","ge","zai","gui","tao","wei","kuang","an","zhuo","tong","sang","huan","ju","dang","qiao","jiang","zhuang","tong","liang","mei","bang","geng","shao","meng","wu","li","suo","ti","xie","shu","jian","mian","qi","gun","bang","zong","ji","peng","tang","sen","leng","ke","guan","yi","zhi","chui","jiao","tuo","ye","chuan","chun","xie","chu","leng","kai","lou","gai","yu","lang","bang","zha","liu","que","huai","kan","cao","fan","zhang","mo","heng","ying","qiao","cheng","xiang","chu","tan","xi","meng","qian","ci","huan","xin","ou","yu","qi","kuan","xie","qian","ge","zhi","zheng","ci","bu","wu","qi","wai","dai","si","jian","yang","dai","xun","shu","can","zhi","ou","duan","yin","dian","hui","yi","wu","mu","mei","du","bi","bi","bi","pi","bi","mao","zhan","hao","tan","shi","min","mang","qi","nai","fen","fu","qing","hai","yang","an","dan","lv","qing","shui","yong","ting","zhi","qiu","hui","han","xi","shan","han","xun","ru","gong","jiang","chi","wu","tang","wang","tai","ji","xiong","qi","fen","qin","yi","wo","shen","chen","qi","sha","pei","gou","mei","ou","li","lun","cang","hu","mo","ju","he","fei","you","zhi","zhao","gu","zhan","yan","xie","qiu","quan","po","mi","fa","fan","ning","pao","bo","qi","ni","zhu","lei","tai","yong","beng","xie","po","ze","jie","yang","sa","xi","luo","dong","jin","hong","er","zhou","huo","wa","qia","pai","liu","qian","jiang","jiao","zhuo","ce","ji","hun","nong","zhe","jun","pu","hao","lang","fu","yu","hai","jin","tu","nie","xiao","she","yong","xian","ti","tao","lao","lian","wo","huan","di","run","jian","zhang","se","fu","ya","ye","han","he","dian","zi","xiao","lin","tang","shu","nao","tao","dan","yu","yin","cui","huai","shen","chun","hun","yan","tian","qing","yuan","zi","jian","yu","shen","yu","qu","du","zha","bo","wen","wei","gang","ke","you","miao","pai","tuan","hu","xiang","zhan","wan","shi","kui","jian","gai","yuan","liu","yi","xi","su","rong","ni","chu","dian","zi","hua","zi","tao","gun","zhi","man","lv","lan","luan","bin","tan","di","piao","qi","lou","li","yan","mo","man","shu","zhang","yang","wei","pan","qian","lu","lao","tan","chao","cheng","che","peng","lan","zao","ao","ji","bin","pu","guan","huo","mie","deng","hui","ling","zao","jiu","zhuo","zai","can","lu","chui","yan","chao","gui","kang","zhi","ju","tan","pao","jiong","bing","zha","dian","lian","chi","shuo","lan","ting","lie","hong","lao","zhu","yan","kao","fan","shao","hui","tang","jin","re","xi","wan","peng","feng","yan","han","huan","bei","fen","jiao","yan","ran","huang","jian","sha","mei","zhao","zhu","shan","xi","xiong","xun","rong","xi","shu","ao","ran","liao","yan","zao","bao","zhao","pa","ai","jue","fu","ye","ba","die","shuang","pian","ban","pai","ya","niu","mou","mu","lao","mu","wu","sheng","qian","te","xi","xi","li","du","quan","fan","zhuang","you","kuang","di","bei","hu","gou","ju","ning","hen","jiao","du","xia","shi","zheng","yu","li","lang","lie","chang","meng","cai","xing","zhu","mao","xian","hou","hua","yuan","ta","xuan","lv","yu","wang","jiu","ma","wan","mei","huan","xian","ling","bo","shan","zhen","fa","zhu","ban","qiu","lang","li","liu","suo","zuo","lin","qin","pi","pa","qiong","hu","rui","se","gui","yao","li","gua","piao","ban","rang","wa","weng","ping","ci","zhen","gan","shen","tian","sheng","sheng","yong","shuai","fu","beng","tian","you","jia","shen","dian","nan","dian","hua","chang","jie","wei","pan","liu","chu","lve","qi","fan","chou","ji","jiang","shu","yi","liao","ge","jiu","nve","yang","ba","jie","yi","chuang","feng","pi","ci","zhen","teng","ju","ji","bing","zheng","yong","jing","quan","yang","zhi","hen","dou","tong","pi","li","huan","tan","chi","bi","cui","wen","liu","shou","da","bie","tan","zhang","que","liu","lao","xian","fei","dan","yin","he","ai","xian","guan","gui","nong","yu","wei","yong","lei","li","shu","dan","lin","lin","bie","ji","chi","yang","xuan","jie","zheng","me","li","huo","lai","ji","xuan","ying","yin","yong","tan","dian","luo","luan","luan","bo","bo","gui","ba","fa","deng","fa","bai","bai","qie","ji","zao","zao","mao","de","pa","jie","huang","ci","ling","gao","mo","ji","peng","gao","ai","e","han","bi","wan","chou","qian","ai","xiao","hao","huang","hao","ze","cui","hao","xiao","ye","hao","jiao","ai","xing","huang","li","piao","he","jiao","pi","gan","pao","zhou","qiu","que","zha","gu","jun","jun","zhou","zha","gu","zhao","du","min","qi","ying","yu","bei","zhao","zhong","pen","he","ying","he","yi","bo","wan","ang","zhan","yan","jian","he","yu","kui","fan","gai","dao","pan","fu","qiu","sheng","dao","lu","zhan","meng","li","jin","xu","jian","pan","an","lu","xu","zhou","dang","an","gu","li","mu","ding","gan","mang","wang","zhi","qi","yuan","tian","xiang","xin","xi","pan","feng","dun","min","ming","sheng","shi","yun","pan","fang","mei","mao","kan","xian","shi","yang","zheng","yao","shen","huo","da","zhen","kuang","ju","shen","mei","mo","zhu","zhen","zhen","mian","shi","die","ni","zi","chao","zha","xuan","bing","mi","long","tong","mi","die","di","ne","ming","xuan","kuang","juan","zhen","tiao","yang","yan","mo","zhong","mo","zhe","zheng","mei","shao","han","huan","cheng","cuo","juan","e","man","xian","xi","kun","shan","tian","gun","wan","leng","shi","qiong","lie","jing","zheng","li","lai","sui","juan","shui","du","bi","mu","hun","lu","yi","jie","cai","zhou","yu","hun","ma","xia","xing","hui","gun","zai","chun","jian","mei","du","hou","xuan","tian","xu","fa","wo","miao","chou","kui","mi","weng","kou","dang","chen","xia","qiong","mo","man","fen","ze","zhang","yi","diao","kou","mo","shun","cong","lou","chi","man","gui","wan","run","pie","xi","qiao","pu","zhu","deng","shen","shun","liao","che","xian","ye","xu","tong","mou","gui","jian","ye","ai","hui","zhan","jian","zhao","mei","chou","sao","ning","xun","yao","huo","meng","mian","pin","mian","lei","kuang","xuan","mian","huo","lu","meng","long","guan","man","xi","chu","tang","kan","zhu","mao","jin","yu","shuo","ze","jue","shi","yi","shen","zhi","hou","ying","ju","zhou","jiao","duan","ai","jiao","zeng","yue","ba","shi","ding","qi","zi","wu","zhe","ku","gang","xi","fan","kuang","ma","sha","dan","jue","li","fu","min","e","kang","zhi","qi","kan","jie","bin","e","pi","zhe","yan","sui","zhuan","wa","yan","jin","mo","ju","yu","ke","tuo","zhen","e","mu","zhu","nu","ping","peng","ling","pao","le","po","bo","po","shen","za","yong","li","kuang","chu","keng","quan","zhu","kuang","gui","e","qia","lu","wei","ai","xian","yan","peng","xi","lao","hong","shuo","qing","wei","qiao","yi","keng","xiao","que","chan","lang","hong","yu","xiao","xia","mang","luo","yong","che","che","liu","ying","que","yan","sha","kun","yu","chi","hua","lu","chen","jian","nve","song","zhuo","keng","peng","yan","zhui","kong","cheng","qi","zong","qing","lin","jun","bo","min","diao","jian","he","lu","ai","sui","que","leng","bei","yin","wu","qi","lun","wan","dian","nao","ruan","yan","die","ding","tuo","ying","ke","bi","wei","shuo","zhen","duan","xia","dang","ti","nao","peng","jian","tan","cha","tian","qi","dun","feng","que","que","ma","gong","nian","su","e","ci","liu","si","tang","bang","hua","pi","wei","lei","cuo","tian","xia","xi","lian","pan","wei","yun","dui","ke","la","zhuan","yao","zhuan","chan","qi","ao","peng","liu","lu","kan","chuang","chen","yin","lei","biao","qi","mo","qi","cui","zong","chuo","lun","ji","shan","lao","zeng","jian","xi","lin","ding","tan","huang","pan","za","qiao","di","li","jian","jiao","xi","zhang","qiao","jian","yu","zhui","he","ke","ze","lei","jie","chu","ye","que","dang","yi","pi","pi","yu","pin","e","ai","ke","jian","yu","ruan","pao","ci","bo","yang","ma","xian","kuang","lei","lei","zhi","li","li","fan","que","pao","ying","li","long","long","mo","shuang","guan","lan","ca","yan","shi","li","reng","she","yue","qi","ta","ma","xie","yao","qi","qi","beng","dui","zhong","ren","yi","shi","you","zhi","tiao","fu","mi","zu","suan","mei","zhu","shen","sui","chai","lv","yu","xiang","wu","piao","zhu","gui","xia","zhi","ji","gao","gao","shui","jin","shen","gai","kun","di","dao","huo","tao","gu","guan","zui","ling","lu","jin","dao","zhi","lu","bi","zhe","hui","you","yin","zi","huo","zhen","fu","yuan","wu","xian","yang","zhi","yi","mei","si","di","bei","zhen","yong","ji","gao","tang","si","ma","ta","fu","xuan","qi","yu","ji","si","chan","dan","gui","sui","li","nong","mi","dao","li","yue","ti","zan","lei","rou","yu","li","xie","qin","he","tu","xiu","si","ren","tu","zi","cha","gan","yi","xian","bing","nian","qiu","qiu","zhong","fen","hao","yun","ke","miao","zhi","jing","zhi","yu","mi","ku","ban","pi","ni","li","you","zu","pi","bo","ling","cheng","nian","qin","yang","zuo","zhi","zhi","ju","huo","ji","cheng","tong","zhi","huo","he","yin","zi","zhi","jie","ren","du","yi","zhu","hui","nong","fu","xi","gao","xun","shui","kun","gan","jing","ti","cheng","tu","shao","shui","ya","lun","lu","gu","zuo","zhun","bang","bai","ji","zhi","zhi","kun","leng","peng","bing","chou","zui","yu","lve","xiang","yi","xi","bian","ji","fu","pi","nuo","jie","zhong","zong","xu","cheng","dao","wen","xian","zi","yu","xu","zhi","dao","jia","ji","gao","gao","gu","rong","sui","rong","ji","kang","mu","can","mei","zhi","ji","lu","su","ji","ying","wen","qiu","he","yi","huang","qie","ji","sui","xiao","pu","jiao","zhuo","zhong","zui","lv","sui","nong","se","hui","rang","nuo","yu","pin","ji","tui","wen","cheng","huo","kuang","lv","biao","se","zhuo","li","cuan","xue","wa","jiu","qiong","kong","yu","shen","jing","yao","chuan","tu","lao","qie","zhai","yao","bao","bing","wa","zhu","jiao","qiao","diao","wu","gui","yao","zhi","chuang","yao","jiao","chuang","jiong","xiao","cheng","kou","cuan","wo","dan","ku","zhuo","xu","su","guan","kui","zhuo","wo","wa","ya","qiong","yao","yao","tiao","chao","tian","diao","ju","liao","xi","wu","kui","chuang","zhao","kuan","kuan","long","cheng","cui","liao","zao","cuan","qiao","qiong","dou","zao","long","qie","li","chu","shi","fu","qian","chu","hong","qi","hao","sheng","fen","shu","miao","qu","zhan","zhu","ling","long","bing","jing","jing","zhang","bai","si","jun","hong","tong","jing","diao","yi","shu","jing","qu","jie","ping","duan","li","zhuan","ceng","deng","cun","wai","jing","kan","jing","zhu","le","peng","chi","gan","mang","zhu","wan","jiao","ba","suan","qin","sun","ya","zhui","yuan","hang","xiao","cen","bi","bi","yi","dong","shan","da","di","zhu","na","gu","qie","min","bao","fu","ce","ben","fa","di","ling","nu","fu","fan","gan","fan","shi","mao","ti","jian","qiong","long","min","luo","gui","qu","chi","yin","yao","bi","kuo","deng","xiao","jin","sun","ru","fa","kuang","zhu","tong","ji","da","hang","ce","zhong","lai","shai","dang","ce","fu","tu","li","lang","ju","guan","jian","han","tong","xia","zhi","cheng","suan","zhu","zuo","ting","ce","gao","kuai","gan","chou","kuang","yun","ou","qian","xiao","jian","pou","lai","zou","bi","bi","ge","tai","guai","yu","jian","dao","gu","chi","zheng","sha","zhou","lu","bo","ji","lin","suan","jun","fu","zha","gu","qian","jun","chui","guan","ce","zu","bo","luo","jian","xuan","bian","sun","xiang","xian","ping","xing","hu","yi","yue","chun","lv","wu","dong","shuo","ji","jie","xing","mei","fan","chuan","zhuan","pian","feng","zhu","huang","qie","qiu","miao","qian","gu","shi","lou","yun","he","tang","yue","chou","gao","ruo","zheng","nie","qian","xiao","cuan","long","peng","du","zhuo","chu","shai","zhu","qiang","long","lan","jian","bu","li","hui","bi","di","cong","yan","peng","can","zhuan","pi","piao","yu","tuan","ze","shai","gui","yi","hu","chan","kou","cu","ping","zao","ji","lou","ce","nian","suo","cuan","diao","suo","le","zhu","xiao","bo","mi","shai","dang","liao","dan","fu","jian","min","kui","dai","jiao","huang","sun","lao","xiao","lu","shi","zan","qi","pai","qi","pai","gan","ju","lu","lu","yan","dang","sai","zhua","gou","qian","lian","bu","shi","lan","kui","yu","yue","hao","zhen","tai","ti","nie","chou","ji","yi","qi","teng","zhuan","zhou","fan","sou","zhou","qian","zhuo","teng","lu","lu","jian","tuo","ying","yu","lai","long","qie","lian","lan","qian","yue","zhong","qu","lian","bian","duan","zuan","li","si","luo","ying","yue","zhuo","yu","mi","fan","shen","zhe","shen","nv","he","lei","zi","ni","cun","zhang","qian","zhai","bi","ban","wu","sha","kang","rou","fen","bi","cui","yin","zhe","mi","tai","hu","li","gan","ju","po","mo","cu","zhan","zhou","chi","su","su","hong","tong","ce","yue","zhou","lin","zhuang","bai","lao","fen","er","qu","he","liang","xian","fu","liang","jing","li","yue","lu","ju","qi","cui","bai","zhang","jing","guo","hua","san","tang","bian","mian","zong","hu","jian","li","xie","fu","nuo","bei","gu","xiu","gao","tang","jia","cao","zhuang","tang","mi","san","fen","zao","kang","jiang","mo","san","san","nuo","xi","liang","kuai","bo","huan","shu","zong","xian","nuo","tuan","nie","li","zuo","di","nie","tiao","lan","si","jiu","xi","gong","zheng","jiu","you","ji","cha","zhou","xun","yue","hong","yu","he","wan","ren","wen","wen","qiu","na","zi","tou","niu","fou","ji","shu","chun","pi","zhen","sha","hong","zhi","ji","fen","yun","ren","dan","jin","su","fang","suo","cui","jiu","za","ba","jin","fu","zhi","qi","zi","chou","hong","za","lei","xi","fu","xie","shen","bo","zhu","qu","ling","zhu","shao","gan","yang","fu","tuo","zhen","dai","chu","shi","zhong","xian","zu","jiong","ban","qu","mo","shu","zui","kuang","jing","ren","hang","xie","jie","zhu","chou","gua","bai","jue","kuang","hu","ci","huan","geng","tao","jie","ku","jiao","quan","gai","luo","xuan","beng","xian","fu","gei","dong","rong","tiao","yin","lei","xie","juan","xu","gai","die","tong","si","jiang","xiang","hui","jue","jian","juan","chi","mian","zhen","lv","cheng","qiu","shu","bang","tong","xiao","huan","qin","geng","xiu","ti","tou","xie","hong","xi","fu","ting","sui","dui","kun","fu","jing","hu","zhi","yan","jiong","feng","ji","xu","ren","zong","chen","duo","li","lv","liang","chou","quan","shao","qi","zhun","qi","wan","qian","xian","shou","wei","tao","wan","gang","wang","beng","zhui","cai","guo","cui","lun","liu","qi","zhan","bi","chuo","ling","mian","qi","qie","tian","zong","gun","zou","xi","zi","xing","liang","jin","fei","rui","min","yu","zong","fan","lv","xu","ying","shang","qi","xu","xiang","jian","ke","xian","ruan","mian","ji","duan","chong","di","min","miao","yuan","xie","bao","si","qiu","bian","huan","geng","cong","mian","wei","fu","wei","tou","gou","miao","xie","lian","zong","bian","yun","yin","ti","gua","zhi","yun","cheng","chan","dai","xia","yuan","zong","xu","sheng","wei","geng","xuan","ying","jin","yi","zhui","ni","bang","gu","pan","zhou","jian","ci","quan","shuang","yun","xia","cui","xi","rong","tao","fu","yun","chen","gao","ru","hu","zai","teng","xian","su","zhen","zong","tao","huang","cai","bi","feng","cu","li","suo","yan","xi","zong","lei","juan","qian","man","zhi","lv","mu","piao","lian","xuan","zong","ji","shan","sui","fan","lv","beng","yi","sao","mou","qiang","hun","xian","ji","sha","xiu","ran","xuan","sui","qiao","zeng","zuo","zhi","shan","san","lin","yu","fan","liao","chuo","zun","jian","rao","chan","rui","xiu","hui","hua","zuan","xi","qiang","yun","da","sheng","hui","xi","se","jian","jiang","huan","zao","cong","xie","jiao","bi","dan","yi","nong","sui","yi","shai","xu","ji","bin","qian","lan","pu","xun","zuan","qi","peng","yao","mo","lei","xie","zuan","kuang","you","xu","lei","xian","chan","jiao","lu","chan","ying","cai","rang","xian","zui","zuan","luo","li","lan","lei","lian","jiu","hong","xian","yue","ji","ji","ren","wei","hong","chun","sha","gang","na","ren","zong","lun","fen","zhi","wen","fang","zhu","zhen","niu","xian","lian","zu","shen","xi","zhi","zhong","ban","shao","yi","jing","bang","rong","jie","rao","die","hui","gei","xuan","luo","jue","jiao","tong","juan","xiu","xi","sui","tao","ji","ji","xu","ying","xu","chuo","sheng","wei","mian","beng","chou","tao","zong","zhan","lv","zhui","jian","mian","lan","ji","yun","duan","xian","huan","di","lv","bian","yuan","fu","feng","cui","chan","ying","suo","shan","jiao","xie","gang","fou","que","fou","qi","bo","ping","xiang","zhao","gang","ying","guan","zun","tan","cheng","qi","weng","ying","lei","tan","lu","guan","wang","wang","gang","han","luo","luo","shen","fa","gu","zhu","ju","mao","min","ba","gua","ti","juan","fu","shen","zhao","zui","gua","zhuo","yu","zhi","an","fa","shu","si","ma","liu","ba","fa","chao","wei","bi","ji","chong","liu","juan","mi","zhao","luo","pi","ji","ji","luan","yang","mi","qiang","da","mei","yang","you","you","fen","ba","gao","yang","gu","qiang","zang","gao","ling","yi","zhu","xiu","yi","xian","rong","qun","qun","qiang","huan","xian","yi","yang","qiang","qian","yu","geng","yuan","fan","shan","fen","shan","lian","geng","nou","qiang","yu","gong","chong","weng","fen","hong","chi","chi","cui","fu","xia","ben","la","yi","pi","liu","zhi","qu","xi","xie","xiang","xi","ke","qiao","hui","hui","xiao","sha","hong","jiang","di","cui","dao","sha","chi","xuan","chi","zong","wan","hui","hou","he","han","ao","piao","lian","hou","ao","lin","pen","qiao","ao","fan","yi","hui","xuan","dao","yao","lao","lao","kao","zhe","gou","gou","gou","die","er","shua","ruan","nai","nai","duan","ting","geng","hao","yun","ba","pi","yi","qu","jia","ju","chu","lun","ji","pang","zha","lou","ji","lao","huo","you","huai","er","yi","ye","song","qin","yun","chi","dan","dan","hong","geng","zhi","pan","nie","zhen","che","zheng","you","wa","liao","long","zhi","tiao","er","ya","tie","xu","lian","hao","sheng","lie","pin","jing","ju","bi","di","guo","wen","xu","ping","cong","ding","ni","ting","ju","cong","kui","lian","cong","lian","weng","kui","lian","lian","cong","sheng","song","ting","kui","nie","zhi","dan","ning","qie","ni","ting","ting","long","zhao","si","su","yi","su","si","zhao","zhao","rou","yi","le","ji","qiu","ken","cao","ge","bo","huan","chi","ren","xiao","ru","zhou","yuan","du","gang","gan","cha","chang","gu","zhi","han","fu","fei","fen","pei","pang","jian","fang","you","ang","ken","ran","yu","wen","qi","pi","xi","xi","fei","ken","shen","zhong","zhang","xie","wei","die","dan","fei","ba","bo","qu","tian","bei","tai","zi","fei","zhi","ni","ping","zi","fu","pang","xian","pei","sheng","bao","mu","qu","hu","ke","chi","yang","pang","kua","yi","ge","chi","jiao","xiong","xiong","er","an","heng","neng","zi","gui","cheng","tiao","zhi","cui","mei","xie","cui","xie","mai","mai","ji","xie","nin","zang","qi","nao","nong","wan","bo","wen","xiu","jiao","jing","you","heng","lie","shan","ting","mei","chun","shen","qian","de","juan","cu","xiu","xin","tuo","cheng","nei","pu","dou","tuo","nao","pi","gu","li","lian","zhang","cui","jie","liang","shui","pi","biao","lun","pian","lei","kui","chui","dan","tian","nei","nai","la","ye","ren","shen","chuo","fu","fu","ju","qiang","wan","dong","pi","guo","wo","mei","ni","zhuan","chi","luo","ou","di","an","xing","nao","shuan","yun","zhong","rou","sai","tu","yao","wei","jiao","jia","duan","bi","chang","fu","xian","ni","teng","tui","bang","qian","wa","shou","tang","su","zhui","yi","bo","liao","ji","pi","xie","gao","lv","ou","chang","lu","guo","pang","chuai","biao","jiang","fu","tang","mo","xi","zhuan","lv","jiao","ying","lv","xue","cun","tong","peng","ni","liao","cui","gui","xiao","teng","fan","zhi","jiao","shan","hu","cui","run","xiang","sui","fen","zhua","dan","kuai","nong","tun","bi","yong","jue","chu","yi","juan","la","lian","tun","qi","cui","bin","xun","nao","wo","zang","xian","biao","xing","kuan","la","yan","lu","huo","za","luo","qu","zang","luan","ni","za","chen","qian","wo","guang","lin","guang","zi","jiao","chou","ji","gao","chou","mian","nie","zhi","zhi","ge","jian","die","zhi","xiu","tai","zhen","jiu","xian","cha","yao","xi","jiu","yu","yu","xing","ju","jiu","xin","she","she","she","jiu","tan","shu","shi","tian","tan","pu","pu","guan","hua","tian","shun","xia","wu","zhou","dao","fan","pa","tai","fan","chuan","hang","ban","lu","jian","cang","ling","duo","bo","xian","chuan","xia","qiong","pang","kua","fu","zao","feng","li","yu","lang","ting","yu","bo","nian","ju","huang","ke","bian","mu","die","dao","bang","cha","yi","sou","cang","lou","dai","xue","yao","deng","dang","qiang","lu","yi","ji","jian","huo","qi","lu","lu","chan","shuang","liang","jian","jian","se","yan","ping","yan","yan","cao","yi","le","ting","ai","tiao","jiao","jie","peng","yi","chai","mian","gan","yu","yu","shao","hu","mang","zi","hui","sui","zhi","tun","wei","wu","zhi","qi","wen","ren","fu","jie","lu","xu","fen","ba","xin","hua","hua","fang","jue","gou","qin","ao","chu","mao","ya","reng","hang","yin","you","yi","qie","wei","pi","cang","su","ti","yuan","tai","di","miao","li","yong","ke","bei","bao","gou","yi","ruo","ku","ning","ni","bo","bing","shan","xiu","yao","xian","ben","hong","ying","zha","dong","die","nie","hu","ping","mei","sheng","gu","bi","wei","fu","zhuo","mao","fan","jia","mao","zi","zhi","ji","jing","cong","yuan","xue","ge","li","rong","chai","chen","yu","hao","zi","lie","wu","ji","gui","ci","jian","ci","gou","guang","mang","cha","jiao","yu","zi","yin","cha","fa","rong","ru","mang","zhong","qian","zhu","huan","fu","gai","da","jing","chuan","cao","jing","er","an","qiao","chi","jian","huang","ping","li","jin","lao","shu","zhuang","da","jia","ce","dang","zi","rong","hun","ying","yin","yao","du","wei","li","dou","fu","ren","yin","he","bu","yun","sui","cheng","chen","wu","bie","xi","geng","pu","zhu","mo","li","zhuang","zuo","tuo","qiu","sha","suo","chen","peng","meng","xing","jing","che","jun","yan","cuo","han","cuo","jia","wang","su","niu","shao","xian","mo","wen","jie","nan","mu","lai","lian","tu","huo","ying","gong","mang","mang","ci","di","qu","dong","zou","gu","la","lu","ju","wei","jun","nie","kun","he","pu","zai","gao","guo","lun","chou","chui","zhan","men","cai","li","bo","bao","qin","juan","qin","di","jie","pu","jin","qiao","tai","geng","hua","ling","fei","qin","an","wang","beng","zhou","jian","lin","tan","tian","dao","hu","he","tao","chun","chang","huan","fei","lai","meng","ping","wei","sha","yan","yi","tiao","qi","wan","ce","zhen","tuo","jiu","luo","bi","yi","pan","bo","pao","ding","ying","ying","xiao","sa","qiu","ke","xiang","wan","yu","yu","fu","lian","xuan","nan","ce","wo","chun","xiao","bian","mao","an","luo","ying","kuo","kuo","jiang","mian","zuo","zuo","zu","rou","xi","ye","an","qu","jian","fu","lv","jing","pen","hong","hong","hou","yan","tu","zhu","zi","ge","qing","mi","huang","shen","pu","gai","dong","zhou","jian","wei","bo","wei","ji","hu","zang","duan","yao","sui","cong","quan","zhen","kui","hun","shi","lan","zong","yao","yuan","mei","yun","shu","di","zhuan","guan","ran","xue","hua","jiang","wei","you","sou","yin","shi","chun","shi","yun","zhen","ru","meng","li","que","suan","yuan","li","ju","xi","chu","xu","tu","liu","huo","dian","qian","zu","po","cuo","yuan","chu","yu","pan","pu","pu","na","xi","fen","yun","zheng","ruo","cang","mi","sun","ming","sou","xu","liu","xi","gu","lang","rong","gai","cuo","tang","luo","suo","xuan","yao","gui","bi","zong","gun","zuo","tiao","ce","pei","lan","dan","ji","shen","lang","ling","diao","tiao","mao","tong","chu","peng","an","lian","cong","ping","qiu","jin","chun","jie","wei","tui","cao","yu","yi","zi","bi","lu","bu","zhang","lei","qiang","man","yan","ling","ji","biao","gun","han","di","lu","she","shang","di","mie","xun","man","bo","di","cuo","zhe","shen","xuan","wei","hu","ao","mi","lou","zhong","cai","po","jiang","mi","cong","niao","hui","juan","yin","jian","nian","shu","yin","guo","chen","hu","sha","kou","qian","ma","zang","ze","qiang","ai","bi","li","wei","ji","qian","sheng","meng","ou","chan","dian","jiao","rui","rui","lei","yu","qiao","chu","hua","jian","mai","yun","bao","you","lu","rao","e","ti","fei","jue","fa","ru","fen","kui","shun","ya","xu","fu","dang","wu","dong","si","xiao","xi","long","wen","shao","jian","yun","sun","ling","yu","xia","si","nong","lei","xuan","yun","yu","xi","hao","bao","ai","hui","hui","ji","ci","xiang","wan","mie","leng","jiang","can","shen","qiang","lian","ke","yuan","da","ti","tang","xue","zhan","sun","xian","fan","ding","xie","gu","shu","jian","hao","sa","xin","xun","yao","bai","shu","dui","pin","wei","ning","chou","mai","piao","ji","zao","chen","zhen","er","ni","ying","cong","xiao","qi","fa","jian","xu","kui","ji","bian","diao","mi","lan","jin","cang","miao","qiong","qie","liao","ou","xian","su","lv","yi","xu","xie","yi","la","lei","jiao","di","zhi","bei","teng","yao","mo","huan","biao","fan","sou","tan","tui","qiong","qiao","wei","liu","hui","ou","gao","yun","bao","li","shu","chu","ai","lin","zao","xuan","qin","lai","tuo","wu","rui","rui","qi","lu","su","tui","meng","yun","ping","yu","xun","ji","jiong","xuan","mo","qiu","su","jiong","peng","bo","rang","yi","xian","yu","ju","lian","lian","yin","qiang","ying","long","tou","hua","yue","ling","yao","mei","han","kui","lan","ji","dang","man","lei","lei","hui","feng","zhi","wei","kui","zhan","huai","li","ji","lei","huai","luo","ji","kui","lu","jian","sa","teng","lei","quan","xiao","yi","luan","men","bie","hu","lu","nve","lv","si","xiao","chu","hu","xu","cuo","fu","xu","xu","lu","hu","yu","hao","jiao","ju","bao","yan","zhan","zhan","kui","bin","xi","shu","chong","diao","qiu","ding","shi","xia","jue","zhe","she","yu","han","zi","hong","sui","xia","shi","yi","ma","xiang","fang","e","ba","chi","qian","wen","wen","bang","yue","yue","jun","qi","tong","qi","can","yuan","jue","hui","qin","qi","zhong","ya","mu","wang","fen","fen","hang","zao","fu","ran","bao","ni","dai","ping","chi","ju","li","fu","zha","gou","pi","pi","xian","zhu","diao","bie","bing","zhan","qu","she","tie","gu","dan","gu","ying","ge","ci","hui","hui","mang","fu","wa","lie","zhu","yi","xian","li","yi","ping","qi","ha","she","yi","wang","mo","qie","gui","qiong","man","lao","zhe","xing","jie","qiu","yong","jia","tui","che","bei","e","han","shu","xuan","feng","shen","fu","xian","lang","bi","yuan","you","jie","dan","yan","dian","tui","hui","wo","zhi","song","ju","mi","qi","yu","jun","la","si","lun","li","die","tao","kun","han","han","bang","fei","wei","dun","yuan","suo","qian","rui","ni","wei","liang","dong","e","ban","di","wang","can","yang","ying","chan","ding","la","jie","xie","ting","mao","xu","mian","jie","shi","xuan","huang","yan","rou","wei","fu","yuan","mei","wei","ru","xie","xia","ying","shi","chong","tang","zhu","zong","ti","yuan","meng","la","du","hu","qiu","die","li","wo","yun","qu","ying","jiang","ban","si","ci","xi","weng","lian","ban","rong","rong","ji","wu","xiu","han","yi","bi","hua","yi","du","nai","he","hu","gui","ma","ming","yi","wen","ying","te","zhong","cang","sao","qi","tiao","shang","di","lu","wei","zhi","chen","qu","pi","yu","jian","luo","lou","qin","yin","jiang","wen","xiao","wan","zhe","zhe","ma","guo","liu","cong","li","man","xiao","chang","mo","zui","si","qiu","te","zhi","peng","jiao","qu","bie","liao","gui","xi","ji","zhuan","fei","lao","jue","jue","yin","chan","jiao","nao","xiao","wu","chong","xun","si","chu","cheng","dang","li","xie","shan","yi","jing","da","qi","ci","xiang","she","qin","ying","chai","li","zei","xuan","zhu","ze","xie","mang","xie","qi","rong","jian","hao","ru","zhuo","jie","pin","he","fan","lei","jie","la","min","chun","li","qiu","nie","lu","du","xiao","zhu","long","li","long","feng","ye","pi","nang","gu","ying","shu","xi","can","qu","quan","can","man","jie","zhu","zhuo","xue","huang","nv","pei","xin","zhong","mai","er","ka","mie","xi","xing","yan","kan","yuan","qu","ling","xuan","shu","xian","tong","xiang","jie","xian","ya","hu","wei","dao","chong","wei","dao","zhun","heng","yi","bu","gan","yu","biao","yi","shan","chen","fu","fen","shuai","jie","zhong","dan","yi","zhong","zhong","jie","zhi","xie","ran","zhi","jun","yuan","chai","ao","hui","ran","tuo","ling","dai","bao","pao","yao","zuo","bi","shao","tan","ju","he","xue","xiu","zhen","yi","pa","bo","di","wa","fu","gun","zhi","zhi","ran","yi","tuo","na","gou","xuan","zhe","qu","bei","yu","xi","mi","bo","bo","fu","chi","chi","ku","ren","jiang","jian","bo","jie","er","ru","zhu","gui","yin","cai","lie","ka","xing","zhuang","xu","kun","niao","shu","jia","kun","li","juan","shen","ge","yi","yu","zhen","liu","qun","ji","yi","bu","zhuang","shui","qun","li","ku","fou","chan","kun","tao","yuan","ling","chi","chang","chou","liang","shang","pei","pei","fei","yuan","luo","guo","yan","du","zhi","yi","qi","guo","gua","ken","qi","ti","ti","fu","chong","xie","die","kun","duan","xiu","xiu","he","yuan","bao","fu","yu","tuan","yan","hui","pao","dan","yun","ta","gou","huai","rong","yuan","ru","nai","jiong","suo","ban","tui","sang","niao","ying","jie","huai","ku","lian","li","shi","lv","yi","die","xie","xian","wei","biao","cao","ji","sen","bao","xiang","bi","fu","jian","zhuan","jian","cui","ji","dan","za","fan","bo","xiang","xin","bie","rao","man","lan","ao","ze","gui","cao","sui","nong","chan","lian","jin","dang","shu","tan","bi","lan","fu","zhi","dui","shu","wa","shi","bai","xie","bo","chen","lai","long","xi","xian","lan","zhe","dai","ju","zan","shi","jian","yi","lan","ya","xi","xi","yao","feng","fu","fiao","fu","ba","he","ji","ji","jian","guan","bian","yan","gui","jue","pian","mao","mi","mi","mie","shi","si","chan","luo","jue","mi","tiao","lian","yao","zhi","jun","xi","shan","wei","xi","tian","yu","lan","e","du","qin","pang","ji","ming","ying","gou","qu","zhan","jin","guan","deng","jian","luo","qu","jian","wei","jue","qu","luo","lan","shen","di","guan","jian","guan","yan","gui","mi","shi","lan","jue","tian","jiao","qiu","jin","cu","zhi","chao","ji","dan","di","hua","quan","ge","shi","jie","gui","chu","jie","hun","qiu","xing","ni","ji","lu","zha","bi","xing","shang","gong","zhi","xue","chu","xi","yi","li","jue","xi","yan","xi","yan","yan","ding","fu","qiu","qiu","jiao","ji","fan","xun","diao","hong","chai","tao","xu","jie","yi","ren","xun","yin","shan","qi","tuo","ji","xun","yin","e","fen","ya","yao","song","shen","yin","xin","jue","xiao","ne","chen","you","zhi","xiong","fang","xin","chao","she","yan","sa","zhun","xu","yi","yi","su","chi","he","shen","he","xu","zhen","zhu","zheng","gou","zi","zhan","gu","fu","jian","die","ling","di","yang","nao","pan","zhou","gan","yi","ju","yao","zha","yi","yi","qu","zhao","ping","bi","xiong","qu","ba","da","zu","tao","zhu","ci","zhe","yong","xu","xun","yi","huang","he","shi","cha","xiao","shi","hen","cha","gou","gui","quan","hui","jie","hua","gai","xiang","wei","shen","zhou","tong","mi","zhan","ming","e","hui","yan","xiong","gua","er","bing","tiao","yi","lei","zhu","kuang","kua","wu","yu","teng","ji","zhi","ren","cu","lang","e","kuang","ei","shi","ting","dan","bei","chan","you","keng","qiao","qin","shua","an","yu","xiao","cheng","jie","xian","wu","wu","gao","song","bu","hui","jing","shuo","zhen","shuo","du","hua","chang","shui","jie","ke","qu","cong","xiao","sui","wang","xian","fei","chi","ta","yi","ni","yin","diao","pi","zhuo","chan","chen","zhun","ji","qi","tan","zhui","wei","ju","qing","dong","zheng","ze","zou","qian","zhuo","liang","jian","chu","hao","lun","shen","biao","hua","pian","yu","die","xu","pian","shi","xuan","shi","hun","hua","e","zhong","di","xie","fu","pu","ting","jian","qi","yu","zi","zhuan","xi","hui","yin","an","xian","nan","chen","feng","zhu","yang","yan","huang","xuan","ge","nuo","qi","mou","ye","wei","xing","teng","zhou","shan","po","kui","huang","huo","ge","ying","mi","xiao","mi","xi","qiang","chen","xue","ti","su","bang","chi","qian","shi","jiang","yuan","xie","he","tao","yao","yao","lu","yu","biao","cong","li","mo","mo","shang","zhe","miu","jian","ze","jie","lian","lou","can","ou","gun","xi","zhuo","ao","ao","jin","zhe","yi","hu","jiang","man","chao","han","hua","chan","xu","zeng","se","xi","zha","dui","zheng","nao","lan","e","ying","jue","ji","zun","jiao","bo","hui","zhuan","wu","zen","zha","shi","qiao","tan","zen","pu","sheng","xuan","zao","tan","dang","sui","xian","ji","jiao","jing","zhan","nang","yi","ai","zhan","pi","hui","hua","yi","yi","shan","rang","nou","qian","dui","ta","hu","zhou","hao","ai","ying","jian","yu","jian","hui","du","zhe","xuan","zan","lei","shen","wei","chan","li","yi","bian","zhe","yan","e","chou","wei","chou","yao","chan","rang","yin","lan","chen","xie","nie","huan","zan","yi","dang","zhan","yan","du","ji","ding","fu","ren","ji","tao","rang","qi","tuo","xun","yi","xun","ji","ren","jiang","hui","ya","xu","e","lun","xiong","song","feng","she","fang","jue","zheng","ping","zu","shi","xiong","zha","su","zhen","zhou","ci","bi","yi","shi","shi","cheng","zhu","hua","dan","gui","xun","yi","gai","xiang","cha","zhou","jie","wu","yu","wu","you","hui","shuo","song","qing","zhu","nuo","du","fei","ke","shui","diao","liang","zhun","tan","shen","yi","mou","die","huang","xie","wei","chan","yan","mi","xu","xie","yao","bang","qian","jin","man","miu","tan","lan","pu","qian","gu","huo","dou","wan","xiang","huan","hao","yu","bao","chai","hao","mao","bei","zhen","fu","gong","cai","ze","xian","bai","zhang","huo","zhi","fan","tan","pin","bian","gou","zhu","guan","er","jian","tie","gui","dai","mao","fei","he","zei","jia","hui","lin","lu","zang","zi","she","fu","du","shu","shang","ci","pei","lai","zhui","zhuan","sai","zan","zeng","shan","ying","gan","chi","she","he","zou","fu","zhao","gan","qi","chen","chao","yue","qu","tang","qu","zu","pa","zhi","yue","ba","die","pao","ju","gen","kua","gui","lu","tiao","jian","duo","yong","chou","ta","ju","ti","cai","zong","ti","dao","ta","beng","deng","ceng","dun","cuan","zao","chu","shen","gong","qu","duo","tang","che","ya","gui","xuan","zhuan","lun","ruan","hong","zhou","qing","zai","jiao","jiao","fu","liang","bei","hui","gun","fu","ji","shu","yuan","xia","nian","zhe","xin","gu","ci","pi","la","bian","bian","bian","chen","ru","bian","liao","da","qian","yu","qi","xun","guo","mai","ying","yun","jin","fan","hai","zhe","jin","yuan","wei","lian","chi","tiao","di","po","die","shu","mi","beng","ji","zhui","tui","song","shi","tao","ni","xuan","xun","tou","zhu","di","tu","dou","tong","guang","shi","cheng","su","zao","feng","dai","yi","luo","bi","yu","dun","sui","yu","bian","e","dao","yi","qian","yao","zao","zhe","zun","bi","yao","yi","deng","xing","na","bang","xie","you","han","qiu","shao","zou","lin","yu","jiao","lang","zheng","hao","jun","yun","bu","guo","chen","dan","dou","e","bi","you","qiu","zhuo","pei","jiu","xu","fen","yun","tai","han","su","lao","chou","tong","jiang","jiao","mei","ku","suan","niang","chun","zui","cu","xing","mi","quan","cai","you","shi","li","zhong","ye","liang","jin","fu","jian","zhen","ding","qian","fan","diao","gai","dun","chao","zhong","na","bei","gang","yao","qin","jun","wu","gou","niu","qian","qian","bo","zuan","jia","you","tie","bo","ling","qian","mao","tong","lv","zha","xi","ge","ming","jiao","yi","chan","yin","zhu","pu","lian","xiao","suo","chu","guo","xiu","feng","xin","rui","ti","zhe","cuo","mao","xi","luo","chui","zhui","jin","xian","ding","jian","ju","meng","qiao","duan","du","mei","zhen","nie","nie","gao","bang","jing","liao","lei","lian","xiang","zhang","men","shan","bi","wen","chuang","run","xian","jian","men","zha","nao","gui","wen","min","fa","ge","he","yue","yan","yan","chan","lan","kuo","fu","dui","ruan","fang","yang","yin","zhen","jie","zu","a","tuo","fu","ji","lu","long","chen","lou","mo","jiang","xian","shan","bi","dou","yuan","chu","yun","xian","pei","ling","tao","xian","yu","long","sui","sui","yin","ge","ai","xi","zhang","sui","li","nan","que","yan","xiong","ya","ji","gu","ci","yong","chu","diao","yu","xue","ling","lei","bao","wu","xu","xiao","zhen","mei","huo","ni","lin","shuang","xia","lu","ba","pi","qing","jing","jing","dian","fei","kao","mi","mian","ge","jin","xue","ba","xie","an","qiao","ju","bian","wei","ren","han","jiu","yin","yun","shao","ye","ding","qing","xiang","shun","xu","wan","gu","dun","ban","song","yu","lu","ling","po","jing","jia","yi","pin","tui","ying","ke","ti","yan","e","dian","chan","quan","feng","piao","fei","shi","can","ji","fan","yin","jian","shi","bao","si","er","rao","jiao","bing","e","nei","xian","guan","kui","chan","liu","man","shou","xiang","ma","yu","tuo","xun","chi","qu","bo","lv","shi","ju","zhu","tuo","jia","ma","jiao","luo","hai","cheng","yan","jun","qi","pian","sao","luo","zhou","gu","hai","sui","gao","zong","gui","kui","hun","po","wei","mo","yu","lu","bao","xian","li","jing","sai","bie","lin","niao","ji","ming","ou","ya","ya","yang","yuan","tuo","ge","hong","juan","e","que","peng","he","ying","lu","lu","mai","ma","huang","shu","li","hei","qian","mo","ding","gu","shu","bi","qi","chi","ling","qu","long","gong","gui"];
  function charFullPinyin(ch) {
    var cp = ch.charCodeAt(0) - 0x4E00;
    if (cp < 0 || cp > 0x51A5) return '';
    var lo = 0, hi = PY_CODES.length - 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      var c = PY_CODES[mid];
      if (c === cp) return PY_VALS[mid];
      if (c < cp) lo = mid + 1; else hi = mid - 1;
    }
    return '';
  }
