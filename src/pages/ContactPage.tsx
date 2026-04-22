import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube,
  Loader2
} from 'lucide-react';

export const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || formData.name.length > 100) {
      toast({
        title: 'Error',
        description: 'El nombre es requerido y debe tener menos de 100 caracteres',
        variant: 'destructive'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast({
        title: 'Error',
        description: 'Por favor ingresa un email válido',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.message.trim() || formData.message.length > 1000) {
      toast({
        title: 'Error',
        description: 'El mensaje es requerido y debe tener menos de 1000 caracteres',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: '¡Mensaje enviado!',
        description: 'Nos pondremos en contacto contigo pronto.'
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje. Por favor intenta de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const phoneContacts = [
    { name: 'Jesús de la Iglesia', phone: '673391649' },
    { name: 'Felipe Fernández', phone: '616931153' },
    { name: 'Daniel Escudero', phone: '666242094' },
    { name: 'Sergio Fernández', phone: '672266074' },
    { name: 'Rodrigo Manrique', phone: '605373649' },
  ];

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email',
      content: 'info@femdtorneos.com',
      link: 'mailto:info@femdtorneos.com'
    },
    {
      icon: MapPin,
      title: 'Ubicación',
      content: 'Calle Toreros, 6, Bajo Derecha - 47007 (Valladolid, España)',
      link: 'https://maps.google.com/?q=Calle+Toreros+6+Valladolid+España'
    }
  ];

  const socialLinks = [
    {
      icon: Facebook,
      name: 'Facebook',
      url: 'https://facebook.com',
      color: 'hover:text-blue-600'
    },
    {
      icon: Instagram,
      name: 'Instagram',
      url: 'https://instagram.com',
      color: 'hover:text-pink-600'
    },
    {
      icon: Twitter,
      name: 'Twitter',
      url: 'https://twitter.com',
      color: 'hover:text-blue-400'
    },
    {
      icon: Youtube,
      name: 'YouTube',
      url: 'https://youtube.com',
      color: 'hover:text-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background py-8 sm:py-16">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Mail className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-600" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text">
              Contacto
            </h1>
          </div>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            ¿Tienes alguna pregunta? Estamos aquí para ayudarte
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {/* Contact Form */}
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <Card className="border-2 hover:border-emerald-600/30 transition-all duration-300">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                  <Send className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  Envíanos un mensaje
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Completa el formulario y nos pondremos en contacto contigo lo antes posible
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nombre completo *
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Tu nombre"
                        required
                        maxLength={100}
                        className="w-full h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="tu@email.com"
                        required
                        maxLength={255}
                        className="w-full h-11"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Teléfono
                      </label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+34 XXX XXX XXX"
                        maxLength={20}
                        className="w-full h-11"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Asunto
                      </label>
                      <Input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="Tema de consulta"
                        maxLength={200}
                        className="w-full h-11"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Mensaje *
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Escribe tu mensaje aquí..."
                      required
                      maxLength={1000}
                      rows={5}
                      className="w-full resize-none min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.message.length}/1000 caracteres
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base sm:text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Enviar mensaje
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info & Social Media */}
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            {/* Contact Information */}
            <Card className="border-2 hover:border-emerald-600/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl">Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Phone contacts */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Teléfonos</h3>
                  </div>
                  <div className="space-y-2 ml-14">
                    {phoneContacts.map((contact, i) => (
                      <a
                        key={i}
                        href={`tel:+34${contact.phone}`}
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-primary" />
                        <span className="font-medium">{contact.phone}</span>
                        <span className="text-muted-foreground">{contact.name}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {contactInfo.map((info, index) => (
                  <a
                    key={index}
                    href={info.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <info.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{info.title}</h3>
                      <p className="text-sm text-muted-foreground">{info.content}</p>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>

            {/* Social Media Links */}
            <Card className="border-2 hover:border-emerald-600/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl">Síguenos</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Mantente conectado con nosotros en redes sociales
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex flex-col items-center gap-3 p-6 rounded-lg bg-muted/50 hover:bg-muted transition-all duration-300 hover:scale-105 ${social.color}`}
                    >
                      <social.icon className="w-8 h-8" />
                      <span className="text-sm font-medium">{social.name}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="border-2 hover:border-emerald-600/30 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl">Horario de Atención</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium">Lunes - Viernes</span>
                  <span className="text-sm text-muted-foreground">9:00 - 18:00</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-sm font-medium">Sábado</span>
                  <span className="text-sm text-muted-foreground">10:00 - 14:00</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium">Domingo</span>
                  <span className="text-sm text-muted-foreground">Cerrado</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-12 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <Card className="overflow-hidden border-2 hover:border-emerald-600/30 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-600" />
                Nuestra Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="w-full h-96 bg-muted relative overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2959.5!2d-4.7245!3d41.6520!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd475f8a!2sCalle+Toreros+6+Valladolid!5e0!3m2!1ses!2ses"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale hover:grayscale-0 transition-all duration-500"
                ></iframe>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
