"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'fr' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'Admin': 'Admin',
    'Start Survey': 'Start Survey',
    'Estimated time:': 'Estimated time:',
    'minutes': 'minutes',
    'Active Surveys': 'Active Surveys',
    'Share your voice and help empower Canadian youth.': 'Share your voice and help empower Canadian youth.',
    'Share your perspective on issues that matter.': 'Share your perspective on issues that matter.',
    'Coming Soon': 'Coming Soon',
    'Completed': 'Completed',
    'Done': 'Done',
    'Almost Done!': 'Almost Done!',
    'What is your email address?': 'What is your email address?',
    'Before we begin': 'Before we begin',
    'Information': 'Information',
    'Question': 'Question',
    'of': 'of',
    'Submit': 'Submit',
    'Next': 'Next',
    'Back': 'Back',
    'Submitting...': 'Submitting...',
    'Finish Survey': 'Finish Survey',
    'Continue': 'Continue',
    'A valid email address is required to enter the raffle and to contact participants when the second and third questionnaires are released.': 'A valid email address is required to enter the raffle and to contact participants when the second and third questionnaires are released.',
    'Email addresses will remain confidential and will not be shared publicly or used for purposes unrelated to the survey series or raffle administration.': 'Email addresses will remain confidential and will not be shared publicly or used for purposes unrelated to the survey series or raffle administration.',
    'More Surveys Coming Soon': 'More Surveys Coming Soon',
    'We are preparing new surveys to gather your feedback. Please check back later to share your perspective!': 'We are preparing new surveys to gather your feedback. Please check back later to share your perspective!',
    'START NOW': 'START NOW',
    'MIN': 'MIN',
    'Make Your Voice': 'Make Your Voice',
    'Heard.': 'Heard.',
    '1 Survey = 1 Entry': '1 Survey = 1 Entry',
    'Win $100 (5 Winners!)': 'Win $100 (5 Winners!)',
    'Each survey completed is one entry.': 'Each survey completed is one entry.',
    'One person can complete up to 3 surveys.': 'One person can complete up to 3 surveys.',
    'Winners will be contacted by June 29th.': 'Winners will be contacted by June 29th.',
    'Other:': 'Other:',
    'Type your answer': 'Type your answer',
    'Survey not found or unavailable.': 'Survey not found or unavailable.',
    'Already Completed': 'Already Completed',
    'You have already submitted your response for': 'You have already submitted your response for',
    'Thank you for participating!': 'Thank you for participating!',
    'Please enter a valid email address.': 'Please enter a valid email address.',
    'This question is required. Please provide an answer.': 'This question is required. Please provide an answer.',
    'Failed to submit response': 'Failed to submit response',
    'Failed to submit survey. Please try again.': 'Failed to submit survey. Please try again.',
    'Select an option...': 'Select an option...',
    'Enter a number:': 'Enter a number:',
    'e.g. 100': 'e.g. 100',
    'Select up to': 'Select up to',
    'options': 'options',
    'Strongly Disagree': 'Strongly Disagree',
    'Neutral': 'Neutral',
    'Strongly Agree': 'Strongly Agree',
    'Share your thoughts here...': 'Share your thoughts here...',
    'Thank You!': 'Thank You!',
    'Your responses have been successfully submitted. We greatly appreciate you taking the time to share your voice and help empower Canadian youth.': 'Your responses have been successfully submitted. We greatly appreciate you taking the time to share your voice and help empower Canadian youth.',
    'Thanks for filling out the survey, we would really appreciate if you could share this survey with a friend in order to represent as many voices as possible.': 'Thanks for filling out the survey, we would really appreciate if you could share this survey with a friend in order to represent as many voices as possible.',
    'Keep Your Voice Heard': 'Keep Your Voice Heard',
    'If you have a few more minutes, consider contributing to another active survey.': 'If you have a few more minutes, consider contributing to another active survey.',
    'Participate in this survey to share your perspectives.': 'Participate in this survey to share your perspectives.',
    'Take Survey': 'Take Survey',
    'There are no other active surveys at the moment. Please check back later!': 'There are no other active surveys at the moment. Please check back later!',
    'Are you still there? Please select "Yes" to continue.': 'Are you still there? Please select "Yes" to continue.',
    'No': 'No',
    'Yes': 'Yes',
    'Maybe': 'Maybe',
    'True': 'True',
    'False': 'False',
    'out of': 'out of',
    'Please enter exactly 3 characters in the format A1A (letter, number, letter).': 'Please enter exactly 3 characters in the format A1A (letter, number, letter).',
    'Enter the first 3 characters of your postal code (e.g. M5V).': 'Enter the first 3 characters of your postal code (e.g. M5V).',
    'Follow Us!': 'Follow Us!',
    'Stay In Touch': 'Stay In Touch',
    'For CYC program updates, please sign-up for our mailing list:': 'For CYC program updates, please sign-up for our mailing list:',
    'Copyright © 2021. All rights reserved.': 'Copyright © 2021. All rights reserved.',
  },
  fr: {
    'Admin': 'Administrateur',
    'Start Survey': 'Commencer le sondage',
    'Estimated time:': 'Temps estime :',
    'minutes': 'minutes',
    'Active Surveys': 'Sondages en cours',
    'Share your voice and help empower Canadian youth.': 'Faites entendre votre voix et contribuez a l\'autonomisation des jeunes Canadiens.',
    'Share your perspective on issues that matter.': 'Partagez votre point de vue sur les enjeux importants.',
    'Coming Soon': 'Bientôt disponible',
    'Completed': 'Terminé',
    'Done': 'Fait',
    'Almost Done!': 'Presque Terminé !',
    'What is your email address?': 'Quelle est votre adresse courriel ?',
    'Before we begin': 'Avant de commencer',
    'Information': 'Informations',
    'Question': 'Question',
    'of': 'sur',
    'Submit': 'Soumettre',
    'Next': 'Suivant',
    'Back': 'Retour',
    'Submitting...': 'Soumission...',
    'Finish Survey': 'Terminer le sondage',
    'Continue': 'Continuer',
    'A valid email address is required to enter the raffle and to contact participants when the second and third questionnaires are released.': 'Une adresse courriel valide est requise pour participer au tirage au sort ainsi que pour communiquer avec les participants lors de la publication des deuxième et troisième questionnaires.',
    'Email addresses will remain confidential and will not be shared publicly or used for purposes unrelated to the survey series or raffle administration.': 'Les adresses courriel demeureront confidentielles. Elles ne seront ni divulguées publiquement ni utilisées à des fins autres que celles liées à la série de sondages ou à l’administration du tirage au sort.',
    'More Surveys Coming Soon': 'Plus de sondages à venir bientôt',
    'We are preparing new surveys to gather your feedback. Please check back later to share your perspective!': 'Nous préparons de nouveaux sondages pour recueillir vos commentaires. Veuillez revenir plus tard pour partager votre point de vue !',
    'START NOW': 'COMMENCER',
    'MIN': 'MIN',
    'Make Your Voice': 'Faites entendre',
    'Heard.': 'votre voix.',
    '1 Survey = 1 Entry': '1 Sondage = 1 Participation',
    'Win $100 (5 Winners!)': 'Gagnez 100$ (5 Gagnants!)',
    'Each survey completed is one entry.': 'Chaque sondage complété correspond à une participation.',
    'One person can complete up to 3 surveys.': 'Une personne peut compléter jusqu\'à 3 sondages.',
    'Winners will be contacted by June 29th.': 'Les gagnants seront contactés d\'ici le 29 juin.',
    'Other:': 'Autre:',
    'Type your answer': 'Tapez votre réponse',
    'Survey not found or unavailable.': 'Sondage introuvable ou indisponible.',
    'Already Completed': 'Déjà terminé',
    'You have already submitted your response for': 'Vous avez déjà soumis votre réponse pour',
    'Thank you for participating!': 'Merci d\'avoir participé !',
    'Please enter a valid email address.': 'Veuillez entrer une adresse courriel valide.',
    'This question is required. Please provide an answer.': 'Cette question est obligatoire. Veuillez fournir une réponse.',
    'Failed to submit response': 'Échec de l\'envoi de la réponse.',
    'Failed to submit survey. Please try again.': 'Échec de l\'envoi du sondage. Veuillez réessayer.',
    'Select an option...': 'Sélectionnez une option...',
    'Enter a number:': 'Entrez un nombre :',
    'e.g. 100': 'ex. 100',
    'Select up to': 'Sélectionnez jusqu\'à',
    'options': 'options',
    'Strongly Disagree': 'Tout à fait en désaccord',
    'Neutral': 'Neutre',
    'Strongly Agree': 'Tout à fait d\'accord',
    'Share your thoughts here...': 'Partagez vos idées ici...',
    'Thank You!': 'Merci !',
    'Your responses have been successfully submitted. We greatly appreciate you taking the time to share your voice and help empower Canadian youth.': 'Vos réponses ont bien été soumises. Nous vous remercions sincèrement d\'avoir pris le temps de partager votre voix et de contribuer à l\'autonomisation des jeunes Canadiens.',
    'Thanks for filling out the survey, we would really appreciate if you could share this survey with a friend in order to represent as many voices as possible.': 'Merci d\'avoir rempli le sondage, nous vous serions très reconnaissants de bien vouloir le partager avec un(e) ami(e) afin de représenter le plus grand nombre de voix possible.',
    'Keep Your Voice Heard': 'Faites entendre votre voix',
    'If you have a few more minutes, consider contributing to another active survey.': 'Si vous avez quelques minutes de plus, pensez à répondre à un autre sondage actif.',
    'Participate in this survey to share your perspectives.': 'Participez à ce sondage pour partager votre point de vue.',
    'Take Survey': 'Faire le sondage',
    'There are no other active surveys at the moment. Please check back later!': 'Il n\'y a aucun autre sondage actif pour le moment. Veuillez revenir plus tard !',
    'Are you still there? Please select "Yes" to continue.': 'Êtes-vous toujours là ? Veuillez sélectionner "Oui" pour continuer.',
    'No': 'Non',
    'Yes': 'Oui',
    'Maybe': 'Peut-être',
    'True': 'Vrai',
    'False': 'Faux',
    'out of': 'sur',
    'Please enter exactly 3 characters in the format A1A (letter, number, letter).': 'Veuillez entrer exactement 3 caractères au format A1A (lettre, chiffre, lettre).',
    'Enter the first 3 characters of your postal code (e.g. M5V).': 'Entrez les 3 premiers caractères de votre code postal (ex. M5V).',
    'Follow Us!': 'Suivez-Nous !',
    'Stay In Touch': 'Restez en Contact',
    'For CYC program updates, please sign-up for our mailing list:': 'Pour les mises à jour du programme CYC, veuillez vous inscrire à notre liste de diffusion :',
    'Copyright © 2021. All rights reserved.': 'Droits d\'auteur © 2021. Tous droits réservés.',
  },
  zh: {
    'Admin': '管理',
    'Start Survey': '开始调查',
    'Estimated time:': '预计时间:',
    'minutes': '分钟',
    'Active Surveys': '进行中的调查',
    'Share your voice and help empower Canadian youth.': '分享您的声音，助力赋能加拿大青年。',
    'Share your perspective on issues that matter.': '分享您对重要问题的看法。',
    'Coming Soon': '即将推出',
    'Completed': '已完成',
    'Done': '完成',
    'Almost Done!': '快完成了！',
    'What is your email address?': '您的电子邮箱地址是什么？',
    'Before we begin': '开始之前',
    'Information': '信息',
    'Question': '问题',
    'of': '/',
    'Submit': '提交',
    'Next': '下一步',
    'Back': '返回',
    'Submitting...': '提交中...',
    'Finish Survey': '完成调查',
    'Continue': '继续',
    'A valid email address is required to enter the raffle and to contact participants when the second and third questionnaires are released.': '需要有效的电子邮件地址才能参加抽奖，并在发布第二和第三份问卷时联系参与者。',
    'Email addresses will remain confidential and will not be shared publicly or used for purposes unrelated to the survey series or raffle administration.': '电子邮件地址将保密，不会公开发布，也不会用于与系列调查或抽奖管理无关的用途。',
    'More Surveys Coming Soon': '更多调查即将推出',
    'We are preparing new surveys to gather your feedback. Please check back later to share your perspective!': '我们正在准备新的调查以收集您的反馈。请稍后再来分享您的观点！',
    'START NOW': '现在开始',
    'MIN': '分钟',
    'Make Your Voice': '让您的声音',
    'Heard.': '被听到。',
    '1 Survey = 1 Entry': '1次调查 = 1次抽奖机会',
    'Win $100 (5 Winners!)': '赢取$100 (5名获奖者！)',
    'Each survey completed is one entry.': '每次完成调查即获得一次抽奖机会。',
    'One person can complete up to 3 surveys.': '每人最多可完成3次调查。',
    'Winners will be contacted by June 29th.': '获奖者将在6月29日前收到通知。',
    'Other:': '其他:',
    'Type your answer': '输入您的回答',
    'Survey not found or unavailable.': '调查未找到或不可用。',
    'Already Completed': '已完成',
    'You have already submitted your response for': '您已经提交了对以下调查的答复：',
    'Thank you for participating!': '感谢您的参与！',
    'Please enter a valid email address.': '请输入有效的电子邮件地址。',
    'This question is required. Please provide an answer.': '此问题为必填项。请提供答案。',
    'Failed to submit response': '提交回复失败',
    'Failed to submit survey. Please try again.': '提交调查失败。请重试。',
    'Select an option...': '选择一个选项...',
    'Enter a number:': '输入数字:',
    'e.g. 100': '例如 100',
    'Select up to': '最多选择',
    'options': '项',
    'Strongly Disagree': '强烈反对',
    'Neutral': '中立',
    'Strongly Agree': '强烈同意',
    'Share your thoughts here...': '在这里分享您的想法...',
    'Thank You!': '谢谢！',
    'Your responses have been successfully submitted. We greatly appreciate you taking the time to share your voice and help empower Canadian youth.': '您的回复已成功提交。我们非常感谢您抽出宝贵时间分享您的声音，助力赋能加拿大青年。',
    'Thanks for filling out the survey, we would really appreciate if you could share this survey with a friend in order to represent as many voices as possible.': '感谢您填写问卷，如果您能将此问卷分享给朋友，我们将不胜感激，以便代表尽可能多的声音。',
    'Keep Your Voice Heard': '继续发声',
    'If you have a few more minutes, consider contributing to another active survey.': '如果您还有几分钟时间，请考虑参与其他进行中的调查。',
    'Participate in this survey to share your perspectives.': '参与此调查，分享您的观点。',
    'Take Survey': '参与调查',
    'There are no other active surveys at the moment. Please check back later!': '目前没有其他进行中的调查。请稍后再来！',
    'Are you still there? Please select "Yes" to continue.': '您还在吗？请选择“是”以继续。',
    'No': '否',
    'Yes': '是',
    'Maybe': '也许',
    'True': '正确',
    'False': '错误',
    'out of': '/',
    'Please enter exactly 3 characters in the format A1A (letter, number, letter).': '请输入恰好3个字符，格式为A1A（字母、数字、字母）。',
    'Enter the first 3 characters of your postal code (e.g. M5V).': '请输入您邮政编码的前3个字符（例如M5V）。',
    'Follow Us!': '关注我们！',
    'Stay In Touch': '保持联系',
    'For CYC program updates, please sign-up for our mailing list:': '获取CYC项目更新信息，请注册我们的邮件列表：',
    'Copyright © 2021. All rights reserved.': '版权所有 © 2021。保留所有权利。',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cyc_language') as Language;
    if (saved === 'fr' || saved === 'en' || saved === 'zh') {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    if (lang === language) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setLanguage(lang);
      localStorage.setItem('cyc_language', lang);
      
      // Allow react to commit the new language text, then fade back in
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 200);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      <div className={`flex-1 flex flex-col w-full transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
