import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  useMediaQuery,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AccountCircle as AccountIcon,
  Create as CreateIcon,
  Article as PostsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Twitter as TwitterIcon,
  Videocam as LiveIcon,
  Apps as AppsIcon,
  Web as WordPressIcon,
  Reddit as RedditIcon,
  Event as EventbriteIcon,
  ExpandLess,
  ExpandMore,
  Public as PublishingIcon,
  LiveTv as LiveStreamIcon,
  AdminPanelSettings as AdminIcon,
  MonitorHeart as MonitorIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout, validateToken } from '../store/slices/authSlice';

const Navigation: React.FC = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [menuAnchors, setMenuAnchors] = React.useState<{[key: string]: HTMLElement | null}>({});
  const [openSubmenu, setOpenSubmenu] = React.useState<{[key: string]: boolean}>({});
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, loading } = useSelector((state: RootState) => state.auth);

  const menuItems = [
    { label: 'Home', path: '/dashboard', icon: <DashboardIcon /> },
    { 
      label: 'Publishing', 
      icon: <PublishingIcon />,
      children: [
        { label: 'Accounts', path: '/accounts', icon: <AccountIcon /> },
        { label: 'Compose', path: '/compose', icon: <CreateIcon /> },
        { label: 'Posts', path: '/posts', icon: <PostsIcon /> },
      ]
    },
    { label: 'WordPress', path: '/wordpress', icon: <WordPressIcon /> },
    { label: 'Reddit', path: '/reddit', icon: <RedditIcon /> },
    { label: 'Eventbrite', path: '/eventbrite', icon: <EventbriteIcon /> },
    { 
      label: 'Live Streaming', 
      icon: <LiveStreamIcon />,
      children: [
        { label: 'Live', path: '/live', icon: <LiveIcon /> },
        { label: 'Stream Apps', path: '/stream-apps', icon: <AppsIcon /> },
      ]
    },
    ...(user?.role === 'admin' ? [{
      label: 'Admin',
      icon: <AdminIcon />,
      children: [
        { label: 'Users', path: '/users', icon: <PeopleIcon /> },
        { label: 'X API Dashboard', path: '/admin/x-api-dashboard', icon: <TwitterIcon /> },
        { label: 'System Monitor', path: '/admin/monitoring', icon: <MonitorIcon /> },
        { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
      ]
    }] : [
      { label: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ]),
  ];

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleProfileMenuClose();
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSubmenuOpen = (event: React.MouseEvent<HTMLElement>, menuKey: string) => {
    setMenuAnchors(prev => ({ ...prev, [menuKey]: event.currentTarget }));
  };

  const handleSubmenuClose = (menuKey: string) => {
    setMenuAnchors(prev => ({ ...prev, [menuKey]: null }));
  };

  const handleMobileSubmenuToggle = (menuKey: string) => {
    setOpenSubmenu(prev => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const renderDesktopMenu = () => (
    <Box sx={{ display: 'flex', mr: 2 }}>
      {menuItems.map((item) => (
        <React.Fragment key={item.label}>
          {item.children ? (
            <>
              <Button
                color="inherit"
                startIcon={item.icon}
                onClick={(e) => handleSubmenuOpen(e, item.label)}
                endIcon={<ExpandMore />}
                sx={{ mx: 0.5 }}
              >
                {item.label}
              </Button>
              <Menu
                anchorEl={menuAnchors[item.label]}
                open={Boolean(menuAnchors[item.label])}
                onClose={() => handleSubmenuClose(item.label)}
              >
                {item.children.map((child) => (
                  <MenuItem
                    key={child.path}
                    onClick={() => {
                      navigate(child.path);
                      handleSubmenuClose(item.label);
                    }}
                  >
                    <ListItemIcon>{child.icon}</ListItemIcon>
                    <ListItemText>{child.label}</ListItemText>
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              startIcon={item.icon}
              onClick={() => navigate(item.path)}
              sx={{
                mx: 0.5,
                bgcolor: location.pathname === item.path ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              {item.label}
            </Button>
          )}
        </React.Fragment>
      ))}
    </Box>
  );

  const renderMobileMenu = () => (
    <Box sx={{ width: 250 }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          SMS
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <React.Fragment key={item.label}>
            {item.children ? (
              <>
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleMobileSubmenuToggle(item.label)}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                    {openSubmenu[item.label] ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={openSubmenu[item.label]} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItem key={child.path} disablePadding>
                        <ListItemButton
                          sx={{ pl: 4 }}
                          selected={location.pathname === child.path}
                          onClick={() => {
                            navigate(child.path);
                            setMobileOpen(false);
                          }}
                        >
                          <ListItemIcon>{child.icon}</ListItemIcon>
                          <ListItemText primary={child.label} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItem disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Social Media Manager
          </Typography>

          {!isMobile && renderDesktopMenu()}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="profile-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <PersonIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
          }}
        >
          {renderMobileMenu()}
        </Drawer>
      )}

      {/* Profile Menu */}
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default Navigation;