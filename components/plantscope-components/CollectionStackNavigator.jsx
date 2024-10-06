import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CollectionScreen from './CollectionScreen';
import PlantDetailsScreen from './PlantDetailsScreen';

const Stack = createStackNavigator();

const CollectionStackNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="CollectionMain"
                component={CollectionScreen}
                options={{ headerShown: false }} 
            />
            
            <Stack.Screen
                name="PlantDetails"
                component={PlantDetailsScreen}
                options={{ headerShown: false }}  

            />
        </Stack.Navigator>
    );
};

export default CollectionStackNavigator;
