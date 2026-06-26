import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';
import { dictionary } from '../translations/dictionary.js';
import { motion } from 'framer-motion';
import { Download, Edit, PlusCircle, ArrowLeft, Heart, Award } from 'lucide-react';

export default function ServiceSelection() {
  const [searchParams] = useSearchParams();
  const block = searchParams.get('block') || 'birth'; // birth, death, marriage
  
  const { language, setKioskState, speak, voiceAssist } = useKioskStore();
  const navigate = useNavigate();

  // Color schemas based on active block
  const blockColors = {
    birth: {
      primary: 'text-saffron-dark',
      bgGrad: 'from-orange-50 to-orange-100/50',
      accent: 'border-saffron',
      cardTheme: 'saffron'
    },
    death: {
      primary: 'text-blue-600',
      bgGrad: 'from-blue-50 to-sky-100/50',
      accent: 'border-blue-custom',
      cardTheme: 'blue'
    },
    marriage: {
      primary: 'text-purple-700',
      bgGrad: 'from-purple-50 to-fuchsia-100/50',
      accent: 'border-purple-custom',
      cardTheme: 'purple'
    }
  };

  const activeTheme = blockColors[block] || blockColors.birth;

  useEffect(() => {
    if (block === 'marriage') {
      navigate(`/print?block=marriage`, { replace: true });
      return;
    }
    // Announce choices in Voice Assistant on load
    if (voiceAssist) {
      const msg = language === 'hi' 
        ? `${dictionary[language][`block_${block}_title`]} चुना गया है। कृपया उपलब्ध सेवाओं में से एक चुनें।` 
        : `${dictionary[language][`block_${block}_title`]} selected. Please select one of the available services.`;
      speak(msg);
    }
    setKioskState('ACTIVE');
  }, [block, language, voiceAssist, speak, setKioskState, navigate]);

  const handleBack = () => {
    navigate('/home');
  };

  const handleSelectService = (service) => {
    if (service === 'download') {
      // Modify navigate destination to /print with context
      navigate(`/print?block=${block}`);
    } else {
      // Navigate to token generation page
      navigate(`/token-generation?type=${service}&block=${block}`);
    }
  };

  const serviceOptions = [
    {
      id: 'download',
      title: dictionary[language].service_dl_title,
      description: dictionary[language].service_dl_desc,
      icon: Download,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-300'
    },
    {
      id: 'correction',
      title: dictionary[language].service_corr_title,
      description: dictionary[language].service_corr_desc,
      icon: Edit,
      color: 'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-300'
    },
    {
      id: 'new_registration',
      title: dictionary[language].service_reg_title,
      description: dictionary[language].service_reg_desc,
      icon: PlusCircle,
      color: 'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-300'
    }
  ];

  return (
    <div className="w-full flex-1 max-w-[1100px] mx-auto flex flex-col items-center justify-center p-4 relative gap-6">
      
      {/* Headings */}
      <div className="text-center flex flex-col gap-2 mt-12 md:mt-4">
        <h2 className={`font-hindi text-4xl font-bold m-0 ${activeTheme.primary} drop-shadow-sm`}>
          {dictionary[language][`block_${block}_title`]}
        </h2>
        <span className="font-bebas text-2xl tracking-widest text-slate-400 uppercase">
          {dictionary[language].service_select_title}
        </span>
      </div>

      {/* Render all 3 service options for Birth, Death, and Marriage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full px-4 mt-4">
        {serviceOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <motion.button
              key={opt.id}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectService(opt.id)}
              className={`flex-1 min-h-[260px] rounded-3xl bg-white border-3 p-6 flex flex-col items-center justify-center gap-4 text-center cursor-pointer shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-all ${opt.color}`}
            >
              <div className="w-16 h-16 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-inner">
                <Icon className="w-8 h-8" />
              </div>
              
              <h3 className="font-hindi text-2xl font-bold text-navy m-0 leading-tight">
                {opt.title}
              </h3>
              
              <p className="text-[0.9rem] font-semibold text-slate-400 font-rajdhani leading-snug m-0 max-w-[200px]">
                {opt.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Decorative Brand Accent */}
      <div className="flex items-center gap-2 mt-8 text-slate-400 text-sm font-semibold font-rajdhani uppercase">
        <Award className="w-4 h-4 text-saffron" />
        <span>Nagar Nigam Secure Portal</span>
      </div>

    </div>
  );
}
 