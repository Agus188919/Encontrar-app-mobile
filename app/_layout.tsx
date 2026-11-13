import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export default function RootLayout() {
    const router = useRouter();

    useEffect(() => {
        const navegarDesdeNotificacion = (response: Notifications.NotificationResponse | null) => {
            if (!response) return;

            const rawData = response.notification.request.content.data as any;
            const payload = rawData?.datos ?? rawData;

            if (payload?.tipo === 'promocion') {
                if (payload.comercioId) {
                    router.push(`/comercio/${payload.comercioId}` as any);
                } else {
                    router.push('/(tabs)/promos' as any);
                }
            }
        };

        Notifications.getLastNotificationResponseAsync().then(navegarDesdeNotificacion);

        const subscription = Notifications.addNotificationResponseReceivedListener(
            navegarDesdeNotificacion
        );

        return () => {
            subscription.remove();
        };
    }, [router]);

    return (
        <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
                name="comercio/[id]"
                options={{
                    headerShown: true,
                    title: 'Ficha del Comercio',
                    headerBackTitle: 'Volver',
                }}
            />

            <Stack.Screen name="comercio/escaner" options={{ headerShown: false }} />
        </Stack>
    );
}   