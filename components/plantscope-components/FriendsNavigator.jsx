import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import FriendsListScreen from './FriendsListScreen';
import SearchScreen from './SearchScreen';
import FriendDetailScreen from './FriendDetailScreen';
import RegisterScreen from './RegisterScreen'; 
import FriendsScreen from './FriendsScreen'; 

const Stack = createStackNavigator();

const FriendsNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="FriendsScreen"> 
        <Stack.Screen 
            name="FriendsScreen" 
            component={FriendsScreen} 
            options={{ 
                title: 'Sign In',
                headerShown: false,
            }} 
        />
        <Stack.Screen 
            name="RegisterScreen" 
            component={RegisterScreen} 
            options={{ 
                title: 'Register',
                headerShown: false,
            }} 
        />
        <Stack.Screen 
            name="FriendsList" 
            component={FriendsListScreen} 
            options={{ 
                title: 'Friends',
                headerLeft: () => null,
                headerShown: false,
            }} 
        />
        <Stack.Screen 
            name="SearchScreen" 
            component={SearchScreen} 
            options={{ title: 'Search Friends' }} 
        />
        <Stack.Screen 
            name="FriendDetailScreen" 
            component={FriendDetailScreen} 
            options={({ route }) => ({
                title: route.params.friend.username + "'s Collection",
            })}        
            />
        </Stack.Navigator>
    );
};

export default FriendsNavigator;
