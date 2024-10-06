import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import CollectionStackNavigator from './CollectionStackNavigator';
import CaptureScreen from './CaptureScreen';
import FriendsScreen from './FriendsScreen';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
    return (
        <Tab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
                let iconName;

                if (route.name === 'Collection') {
                    iconName = 'albums';
                } else if (route.name === 'Capture') {
                    iconName = 'camera';
                } else if (route.name === 'Friends') {
                    iconName = 'people';
                }

                return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: 'green',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: { backgroundColor: 'white' },

            })}
        >
            <Tab.Screen name="Collection" component={CollectionStackNavigator} />
            <Tab.Screen name="Capture" component={CaptureScreen}/>
            <Tab.Screen name="Friends" component={FriendsScreen}/>
        </Tab.Navigator>
    );
};

export default BottomTabNavigator;
