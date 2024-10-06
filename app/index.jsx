import React from "react";
import { NavigationContainer } from '@react-navigation/native'; 
import BottomTabNavigator from '../components/plantscope-components/BottomTabNavigator';

export default function Index() {
    return (
		<NavigationContainer independent={true}>
			<BottomTabNavigator/>
		</NavigationContainer>
    );
}
