import * as React from 'react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Sparkles, 
  ImageIcon, 
  Wand2, 
  Download, 
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Camera,
  Wand
} from 'lucide-react';
import { editCarImage } from '../services/geminiService';

interface AIPhotoEditorProps {
  onBack: () => void;
}

const WATERMARK_INSTRUCTION = " Add a subtle, professional watermark text 'DRAGFIRE' in the bottom right corner of the image, using a modern, bold, and italic font style.";

const PRESET_PROMPTS = [
  {
    id: 'paint',
    label: 'Pintura Zero',
    description: 'Mude a cor do seu carro mantendo a originalidade.',
    prompt: `Change the color of the car in this photo to [COLOR_NAME]. Keep the background, lighting, reflections, and all other vehicle details exactly as they are. Only modify the paint color of the car body. Do not distort the image or change any other elements.${WATERMARK_INSTRUCTION}`
  },
  {
    id: 'wheels',
    label: 'Troca de Rodas',
    description: 'Escolha um novo modelo de rodas para o seu carro.',
    prompt: `Replace the current wheels on this car with [WHEEL_NAME] wheels of size [WHEEL_SIZE]. [LOWERING_INSTRUCTION] Focus strictly on the wheels and suspension height. Keep the background, lighting, and all other car body details exactly as they are. Do not distort the car or the environment.${WATERMARK_INSTRUCTION}`
  },
  {
    id: 'background',
    label: 'Troca de Fundo',
    description: 'Coloque seu carro em cenários incríveis.',
    prompt: `Remove the original background and place this car in a [BACKGROUND_NAME] environment. Adjust the car's lighting, shadows, and reflections to match the new background perfectly. Ensure the car remains sharp and undistorted.${WATERMARK_INSTRUCTION}`
  },
  {
    id: 'enhance',
    label: 'Melhorar Aparência',
    description: 'Ajusta iluminação, contraste e cores para um visual profissional.',
    prompt: `Apply a [ENHANCE_STYLE] enhancement to this car photo. Adjust lighting, contrast, and colors to make it look like a professional automotive magazine photo. Make the paint pop and the wheels look clean.${WATERMARK_INSTRUCTION}`
  },
  {
    id: 'motion',
    label: 'Efeito de Velocidade',
    description: 'Adiciona desfoque de movimento (motion blur) realista.',
    prompt: `Add a realistic [MOTION_INTENSITY] motion blur effect to the wheels and the background to make it look like the car is driving at high speed. Keep the car body sharp.${WATERMARK_INSTRUCTION}`
  },
  {
    id: 'hdr',
    label: 'Estilo HDR Dramático',
    description: 'Visual agressivo com sombras e reflexos realçados.',
    prompt: `Apply a dramatic HDR effect with [HDR_STYLE] style. Enhance contrast, deep shadows, and reflections on the car body. Make it look aggressive and detailed.${WATERMARK_INSTRUCTION}`
  },
  {
    id: 'night',
    label: 'Cenário Noturno',
    description: 'Transforma a foto em um cenário urbano noturno com luzes neon.',
    prompt: `Transform this photo into a night scene in a [NIGHT_STYLE] environment. Add neon lights, wet pavement reflections, and adjust the car lighting to match the vibe.${WATERMARK_INSTRUCTION}`
  }
];

const WHEEL_MODELS = [
  { id: 'bbs_rs', name: 'BBS RS', description: 'Mesh Clássico', image: 'https://images.unsplash.com/photo-1551522435-a13afa10f103?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'te37', name: 'Volk TE37', description: '6 Raios JDM', image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'rpf1', name: 'Enkei RPF1', description: 'Racing Leve', image: 'https://images.unsplash.com/photo-1611510330399-6150734b1200?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'vossen', name: 'Vossen VFS-1', description: 'Multi-raios', image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'rotiform', name: 'Rotiform BLQ', description: 'Mesh Moderno', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'oz_futura', name: 'OZ Futura', description: '3 Peças Clássica', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200&h=200' },
];

const PAINT_COLORS = [
  { id: 'red', name: 'Vermelho Ferrari', hex: '#ef4444' },
  { id: 'blue', name: 'Azul Elétrico', hex: '#3b82f6' },
  { id: 'green', name: 'Verde Esmeralda', hex: '#10b981' },
  { id: 'black', name: 'Preto Fosco', hex: '#18181b' },
  { id: 'white', name: 'Branco Pérola', hex: '#f4f4f5' },
  { id: 'yellow', name: 'Amarelo Speed', hex: '#eab308' },
  { id: 'purple', name: 'Roxo Midnight', hex: '#a855f7' },
  { id: 'orange', name: 'Laranja Sunset', hex: '#f97316' },
  { id: 'grey', name: 'Cinza Nardo', hex: '#71717a' },
];

const BACKGROUND_OPTIONS = [
  { id: 'track', name: 'Pista de Corrida', description: 'Circuito profissional ao pôr do sol', image: 'https://images.unsplash.com/photo-1541447271487-09612b3f49f7?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'city', name: 'Cidade Moderna', description: 'Centro urbano com prédios espelhados', image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'mountain', name: 'Estrada de Montanha', description: 'Curvas sinuosas em cenário natural', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'garage', name: 'Garagem de Luxo', description: 'Ambiente industrial limpo e sofisticado', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=200&h=200' },
  { id: 'beach', name: 'Beira Mar', description: 'Estrada costeira com vista para o oceano', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=200&h=200' },
];

const ENHANCE_STYLES = [
  { id: 'vivid', name: 'Vibrante', instruction: 'vivid and colorful' },
  { id: 'natural', name: 'Natural', instruction: 'clean and natural' },
  { id: 'soft', name: 'Suave', instruction: 'soft and elegant' },
];

const MOTION_INTENSITIES = [
  { id: 'low', name: 'Baixa', instruction: 'subtle' },
  { id: 'medium', name: 'Média', instruction: 'realistic' },
  { id: 'high', name: 'Alta', instruction: 'extreme high-speed' },
];

const HDR_STYLES = [
  { id: 'cinematic', name: 'Cinematográfico', instruction: 'cinematic movie-like' },
  { id: 'gritty', name: 'Agressivo', instruction: 'gritty and sharp' },
  { id: 'vibrant', name: 'Vibrante', instruction: 'vibrant and detailed' },
];

const NIGHT_STYLES = [
  { id: 'cyberpunk', name: 'Cyberpunk', instruction: 'modern city with neon lights' },
  { id: 'moonlight', name: 'Luar', instruction: 'quiet road under moonlight' },
  { id: 'street', name: 'Iluminação Pública', instruction: 'urban street with warm lamps' },
];

const WHEEL_SIZES = ['17"', '18"', '19"', '20"', '22"'];
const LOWERING_OPTIONS = [
  { id: 'none', label: 'Original', instruction: 'Keep the original suspension height.' },
  { id: 'slight', label: 'Esportivo', instruction: 'Slightly lower the car suspension for a sporty look, reducing the wheel gap.' },
  { id: 'slammed', label: 'Socada', instruction: 'Lower the car suspension significantly (slammed look), so the tires are very close to the fenders.' },
];

export function AIPhotoEditor({ onBack }: AIPhotoEditorProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState(PRESET_PROMPTS[0]);
  const [selectedWheel, setSelectedWheel] = useState(WHEEL_MODELS[0]);
  const [selectedColor, setSelectedColor] = useState(PAINT_COLORS[0]);
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUND_OPTIONS[0]);
  const [selectedEnhance, setSelectedEnhance] = useState(ENHANCE_STYLES[0]);
  const [selectedMotion, setSelectedMotion] = useState(MOTION_INTENSITIES[1]);
  const [selectedHDR, setSelectedHDR] = useState(HDR_STYLES[0]);
  const [selectedNight, setSelectedNight] = useState(NIGHT_STYLES[0]);
  const [selectedWheelSize, setSelectedWheelSize] = useState(WHEEL_SIZES[2]); // 19" default
  const [selectedLowering, setSelectedLowering] = useState(LOWERING_OPTIONS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setEditedImage(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      let finalPrompt = selectedPrompt.prompt;
      if (selectedPrompt.id === 'wheels') {
        finalPrompt = finalPrompt.replace('[WHEEL_NAME]', selectedWheel.name)
                                .replace('[WHEEL_SIZE]', selectedWheelSize)
                                .replace('[LOWERING_INSTRUCTION]', selectedLowering.instruction);
      } else if (selectedPrompt.id === 'paint') {
        finalPrompt = finalPrompt.replace('[COLOR_NAME]', selectedColor.name);
      } else if (selectedPrompt.id === 'background') {
        finalPrompt = finalPrompt.replace('[BACKGROUND_NAME]', selectedBackground.name);
      } else if (selectedPrompt.id === 'enhance') {
        finalPrompt = finalPrompt.replace('[ENHANCE_STYLE]', selectedEnhance.instruction);
      } else if (selectedPrompt.id === 'motion') {
        finalPrompt = finalPrompt.replace('[MOTION_INTENSITY]', selectedMotion.instruction);
      } else if (selectedPrompt.id === 'hdr') {
        finalPrompt = finalPrompt.replace('[HDR_STYLE]', selectedHDR.instruction);
      } else if (selectedPrompt.id === 'night') {
        finalPrompt = finalPrompt.replace('[NIGHT_STYLE]', selectedNight.instruction);
      }
      const result = await editCarImage(selectedImage, finalPrompt);
      
      // Add programmatic watermark for consistency
      const watermarked = await addWatermarkToImage(result);
      setEditedImage(watermarked);
    } catch (err) {
      setError("Ocorreu um erro ao processar a imagem. Tente novamente.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const addWatermarkToImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Watermark settings
        const fontSize = Math.max(20, img.width * 0.03);
        ctx.font = `black italic ${fontSize}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw "DRAG"
        const margin = img.width * 0.03;
        const x = img.width - margin;
        const y = img.height - margin;
        
        ctx.fillStyle = 'white';
        const text = 'DRAGFIRE';
        ctx.fillText(text, x, y);
        
        // Add a red highlight to "FIRE" part if possible, but simple white is safer for now
        // Or just draw it as one piece as requested

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = base64;
    });
  };

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `dragfire-ai-edit-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reset = () => {
    setSelectedImage(null);
    setEditedImage(null);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
      <header className="p-4 flex items-center gap-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
        <button onClick={onBack} className="p-2 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-black italic text-white leading-none">EDITOR AI</h2>
          <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-1">Transforme suas fotos com Gemini</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {!selectedImage ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6 h-[60vh]"
          >
            <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/5 shadow-2xl relative">
              <ImageIcon className="w-10 h-10 text-zinc-700" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Nenhuma foto selecionada</h3>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                Selecione uma foto do seu carro para começar a edição profissional com inteligência artificial.
              </p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              <Camera className="w-5 h-5" />
              Selecionar Foto
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl">
              <img 
                src={editedImage || selectedImage} 
                alt="Preview" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-brand-primary animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold uppercase tracking-widest text-xs">Processando com Gemini...</p>
                    <p className="text-zinc-500 text-[10px] mt-1">Isso pode levar alguns segundos</p>
                  </div>
                </div>
              )}
              {editedImage && !isProcessing && (
                <div className="absolute top-4 right-4 flex gap-2">
                  <div className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1 shadow-lg">
                    <CheckCircle2 className="w-3 h-3" />
                    Editado
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!editedImage ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Escolha o Estilo</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {PRESET_PROMPTS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedPrompt(preset)}
                        className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${
                          selectedPrompt.id === preset.id 
                            ? 'bg-brand-primary/10 border-brand-primary/30' 
                            : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          selectedPrompt.id === preset.id ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          <Wand2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-white">{preset.label}</h4>
                          <p className="text-[10px] text-zinc-500 font-medium">{preset.description}</p>
                        </div>
                        {selectedPrompt.id === preset.id && (
                          <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPrompt.id === 'wheels' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Selecione o Modelo da Roda</h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                      {WHEEL_MODELS.map((wheel) => (
                        <button
                          key={wheel.id}
                          onClick={() => setSelectedWheel(wheel)}
                          className={`flex-shrink-0 w-32 space-y-2 group ${selectedWheel.id === wheel.id ? 'opacity-100' : 'opacity-60'}`}
                        >
                          <div className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            selectedWheel.id === wheel.id ? 'border-brand-primary scale-105' : 'border-white/5'
                          }`}>
                            <img src={wheel.image} alt={wheel.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="text-center">
                            <p className={`text-[10px] font-bold uppercase tracking-tighter truncate ${selectedWheel.id === wheel.id ? 'text-brand-primary' : 'text-zinc-400'}`}>
                              {wheel.name}
                            </p>
                            <p className="text-[8px] text-zinc-600 font-medium">{wheel.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedPrompt.id === 'wheels' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Tamanho da Roda</h3>
                      <div className="flex gap-2">
                        {WHEEL_SIZES.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedWheelSize(size)}
                            className={`flex-1 py-3 rounded-xl border transition-all font-bold text-xs ${
                              selectedWheelSize === size 
                                ? 'bg-brand-primary text-white border-brand-primary' 
                                : 'bg-zinc-900/50 border-white/5 text-zinc-500'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Altura da Suspensão</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {LOWERING_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => setSelectedLowering(option)}
                            className={`py-3 rounded-xl border transition-all font-bold text-xs ${
                              selectedLowering.id === option.id 
                                ? 'bg-brand-primary text-white border-brand-primary' 
                                : 'bg-zinc-900/50 border-white/5 text-zinc-500'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {selectedPrompt.id === 'background' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Selecione o Cenário</h3>
                    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                      {BACKGROUND_OPTIONS.map((bg) => (
                        <button
                          key={bg.id}
                          onClick={() => setSelectedBackground(bg)}
                          className={`flex-shrink-0 w-32 space-y-2 group ${selectedBackground.id === bg.id ? 'opacity-100' : 'opacity-60'}`}
                        >
                          <div className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            selectedBackground.id === bg.id ? 'border-brand-primary scale-105' : 'border-white/5'
                          }`}>
                            <img src={bg.image} alt={bg.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                          <div className="text-center">
                            <p className={`text-[10px] font-bold uppercase tracking-tighter truncate ${selectedBackground.id === bg.id ? 'text-brand-primary' : 'text-zinc-400'}`}>
                              {bg.name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedPrompt.id === 'enhance' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Estilo de Melhoria</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {ENHANCE_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedEnhance(style)}
                          className={`py-3 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-tighter ${
                            selectedEnhance.id === style.id 
                              ? 'bg-brand-primary text-white border-brand-primary' 
                              : 'bg-zinc-900/50 border-white/5 text-zinc-500'
                          }`}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedPrompt.id === 'motion' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Intensidade do Movimento</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {MOTION_INTENSITIES.map((intensity) => (
                        <button
                          key={intensity.id}
                          onClick={() => setSelectedMotion(intensity)}
                          className={`py-3 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-tighter ${
                            selectedMotion.id === intensity.id 
                              ? 'bg-brand-primary text-white border-brand-primary' 
                              : 'bg-zinc-900/50 border-white/5 text-zinc-500'
                          }`}
                        >
                          {intensity.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedPrompt.id === 'hdr' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Estilo HDR</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {HDR_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedHDR(style)}
                          className={`py-3 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-tighter ${
                            selectedHDR.id === style.id 
                              ? 'bg-brand-primary text-white border-brand-primary' 
                              : 'bg-zinc-900/50 border-white/5 text-zinc-500'
                          }`}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedPrompt.id === 'night' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Cenário Noturno</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {NIGHT_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedNight(style)}
                          className={`py-3 rounded-xl border transition-all font-bold text-[10px] uppercase tracking-tighter ${
                            selectedNight.id === style.id 
                              ? 'bg-brand-primary text-white border-brand-primary' 
                              : 'bg-zinc-900/50 border-white/5 text-zinc-500'
                          }`}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {selectedPrompt.id === 'paint' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest px-1">Selecione a Cor</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {PAINT_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setSelectedColor(color)}
                          className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                            selectedColor.id === color.id 
                              ? 'bg-white/10 border-white/30' 
                              : 'bg-zinc-900/50 border-white/5'
                          }`}
                        >
                          <div 
                            className="w-8 h-8 rounded-full shadow-inner border border-white/10" 
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className={`text-[8px] font-bold uppercase tracking-tighter text-center ${
                            selectedColor.id === color.id ? 'text-white' : 'text-zinc-500'
                          }`}>
                            {color.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={reset}
                    className="flex-1 py-4 bg-zinc-900 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="flex-[2] py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    Aplicar Edição
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button 
                    onClick={() => setEditedImage(null)}
                    className="flex-1 py-4 bg-zinc-900 text-zinc-400 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Tentar Outro
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="flex-1 py-4 bg-brand-accent text-zinc-950 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Salvar Foto
                  </button>
                </div>
                <button 
                  onClick={reset}
                  className="w-full py-4 bg-zinc-950 border border-white/5 text-zinc-600 rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                >
                  Nova Edição
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
