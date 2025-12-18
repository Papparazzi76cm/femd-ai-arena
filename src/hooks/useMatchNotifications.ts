import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
}

export const useMatchNotifications = () => {
  const { toast } = useToast();
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    // Check current permission
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  const sendNotification = useCallback(({ title, body, icon }: NotificationOptions) => {
    // Always show toast
    toast({
      title,
      description: body,
    });

    // Try to send browser notification
    if ('Notification' in window && permissionRef.current === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: `match-${Date.now()}`,
          requireInteraction: false,
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    }
  }, [toast]);

  const notifyMatchStarted = useCallback((homeTeam: string, awayTeam: string) => {
    sendNotification({
      title: '⚽ ¡Partido Iniciado!',
      body: `${homeTeam} vs ${awayTeam} ha comenzado`,
    });
  }, [sendNotification]);

  const notifyMatchEnded = useCallback((homeTeam: string, awayTeam: string, homeScore: number, awayScore: number) => {
    sendNotification({
      title: '🏁 ¡Partido Finalizado!',
      body: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`,
    });
  }, [sendNotification]);

  const notifyGoal = useCallback((team: string, homeScore: number, awayScore: number) => {
    sendNotification({
      title: '⚽ ¡GOOOL!',
      body: `${team} marca! Resultado: ${homeScore} - ${awayScore}`,
    });
  }, [sendNotification]);

  return {
    requestPermission,
    sendNotification,
    notifyMatchStarted,
    notifyMatchEnded,
    notifyGoal,
  };
};
