import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Promocion } from '../tipos';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const servicioNotificaciones = {

    async configurarCanal(): Promise<void> {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('promociones-ccu', {
                name: 'Promociones Centro Comercial',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#1E3A8A',
            });
        }
    },

    async solicitarPermisos(): Promise<boolean> {
        await this.configurarCanal();

        const existing = await Notifications.getPermissionsAsync();
        let finalStatus = existing.status;

        if (finalStatus !== 'granted') {
            const requested = await Notifications.requestPermissionsAsync();
            finalStatus = requested.status;
        }

        return finalStatus === 'granted';
    },

    async programarAvisoVencimiento(promo: Promocion, nombreComercio: string): Promise<string | null> {
        const permiso = await this.solicitarPermisos();
        if (!permiso) return null;

        const fechaFin = new Date(promo.hasta).getTime();
        const avisoMs = fechaFin - 24 * 60 * 60 * 1000;
        const ahoraMs = Date.now();

        let segundosHastaDisparo = Math.floor((avisoMs - ahoraMs) / 1000);
        if (segundosHastaDisparo <= 0 || segundosHastaDisparo > 86400) {
            segundosHastaDisparo = 5;
        }

        const idNotificacion = await Notifications.scheduleNotificationAsync({
            content: {
                title: `¡Promo por vencer en ${nombreComercio}!`,
                body: `"${promo.titulo}" finaliza pronto. Aprovechá tu descuento exclusivo.`,
                data: { ruta: '/promos', promoId: promo.id, comercioId: promo.comercioId },
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: segundosHastaDisparo,
                repeats: false,
                channelId: 'promociones-ccu',
            },
        });

        return idNotificacion;
    },

    async cancelarAviso(idNotificacion: string): Promise<void> {
        await Notifications.cancelScheduledNotificationAsync(idNotificacion);
    },
};