import * as React from 'react';
import {
    AppBar, Box, CssBaseline, Divider, Drawer, IconButton,
    List, ListItem, ListItemButton, ListItemText,
    Toolbar, Typography, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';   // Matahari 🌞
import DarkModeIcon from '@mui/icons-material/DarkMode';     // Bulan 🌙
import { NavLink } from 'react-router';
import { useThemeMode } from '../hooks/themes/ThemeContext'; // Sesuaikan path

const drawerWidth = 240;
const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Sensus', path: '/members' },
    { label: 'Pemesanan', path: '/category-orders' },
];

export default function DrawerAppBar(props: {
    window?: () => Window;
}) {
    const { window } = props;
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const { mode, toggleColorMode } = useThemeMode();

    const handleDrawerToggle = () => {
        setMobileOpen((prevState) => !prevState);
    };

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                乇丂
            </Typography>
            <Divider />
            <List>
                {navItems.map((item) => (
                    <ListItem key={item.label} disablePadding>
                        <ListItemButton
                            component={NavLink}
                            to={item.path}
                            sx={{
                                textAlign: 'center',
                                '&.active': {
                                    backgroundColor: 'primary.main',
                                    color: 'white',
                                },
                            }}
                        >
                            <ListItemText primary={item.label} />
                        </ListItemButton>

                    </ListItem>
                ))}
            </List>
        </Box>
    );

    const container = window !== undefined ? () => window().document.body : undefined;

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar component="nav">
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    {/* Kiri: Menu icon dan logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { sm: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{ display: { xs: 'block' }, fontWeight: 'bold' }}
                        >
                            乇丂
                        </Typography>
                    </Box>

                    {/* Kanan: Navigation + Theme Toggle */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            {navItems.map((item) => (
                                <Button
                                    key={item.label}
                                    component={NavLink}
                                    to={item.path}
                                    sx={{
                                        color: '#fff',
                                        '&.active': {
                                            borderBottom: '2px solid #fff',
                                            fontWeight: 'bold',
                                        },
                                    }}
                                >
                                    {item.label}
                                </Button>

                            ))}
                        </Box>
                        <IconButton
                            onClick={toggleColorMode}
                            sx={{
                                ml: 1,
                                transition: 'transform 0.3s ease',
                                '&:hover': {
                                    transform: 'rotate(20deg)',
                                },
                            }}
                        >
                            {mode === 'dark' ? (
                                <LightModeIcon sx={{ color: '#FFD700', textShadow: '0 0 5px #FFD700' }} />
                            ) : (
                                <DarkModeIcon sx={{ color: '#9C27B0', textShadow: '0 0 4px #9C27B0' }} />
                            )}
                        </IconButton>
                    </Box>
                </Toolbar>

            </AppBar>
            <nav>
                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
            </nav>
        </Box>
    );
}
